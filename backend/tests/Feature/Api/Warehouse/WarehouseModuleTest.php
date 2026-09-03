<?php

namespace Tests\Feature\Api\Warehouse;

use App\Models\Tenant;
use App\Models\User;
use App\Models\WarehouseItem;
use App\Models\WarehouseLocation;
use App\Models\WarehouseSupplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasWarehouseModule;
use Tests\TestCase;

class WarehouseModuleTest extends TestCase
{
    use HasWarehouseModule, RefreshDatabase;

    private function makeUser(Tenant $tenant, string $role): User
    {
        return User::create([
            'tenant_id' => $tenant->id,
            'name' => "Test {$role}",
            'email' => "{$role}-{$tenant->id}@test.local",
            'password' => 'password123',
            'role' => $role,
            'is_active' => true,
        ]);
    }

    private function makeLocation(Tenant $tenant, string $name = 'Gudang Utama'): WarehouseLocation
    {
        return WarehouseLocation::create(['tenant_id' => $tenant->id, 'name' => $name]);
    }

    private function makeItem(Tenant $tenant, string $name = 'Kardus Sedang'): WarehouseItem
    {
        return WarehouseItem::create(['tenant_id' => $tenant->id, 'name' => $name, 'unit' => 'pcs']);
    }

    public function test_warehouse_routes_are_blocked_without_the_module(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/warehouse/items')
            ->assertStatus(403);
    }

    public function test_owner_can_manage_locations_including_rack_hierarchy(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');

        $warehouseId = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/locations', ['name' => 'Gudang Pusat', 'code' => 'WH-1'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Gudang Pusat')
            ->json('data.id');

        $rackId = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/locations', ['name' => 'Rak A1', 'type' => 'rack', 'parent_id' => $warehouseId])
            ->assertCreated()
            ->assertJsonPath('data.parent_id', $warehouseId)
            ->json('data.id');

        // Duplicate code within the same tenant is rejected.
        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/locations', ['name' => 'Gudang Lain', 'code' => 'WH-1'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');

        // A location with a child (rack) can't be deleted.
        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/warehouse/locations/{$warehouseId}")
            ->assertStatus(422);

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/warehouse/locations/{$rackId}")
            ->assertOk();
    }

    public function test_owner_can_manage_items_with_unique_sku_per_tenant(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/items', ['name' => 'Kardus Besar', 'sku' => 'SKU-001', 'unit' => 'pcs'])
            ->assertCreated()
            ->assertJsonPath('data.sku', 'SKU-001');

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/items', ['name' => 'Kardus Lain', 'sku' => 'SKU-001'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('sku');
    }

    public function test_owner_can_manage_categories_and_assign_them_to_items(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');

        $categoryId = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/categories', ['name' => 'Elektronik'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Elektronik')
            ->json('data.id');

        // Duplicate category name within the same tenant is rejected.
        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/categories', ['name' => 'Elektronik'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $itemId = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/items', ['name' => 'Kabel USB-C', 'warehouse_category_id' => $categoryId])
            ->assertCreated()
            ->assertJsonPath('data.category_name', 'Elektronik')
            ->json('data.id');

        // A category still in use by an item can't be deleted.
        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/warehouse/categories/{$categoryId}")
            ->assertStatus(422);

        $this->actingAs($owner, 'sanctum')->deleteJson("/api/warehouse/items/{$itemId}")->assertOk();

        $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/warehouse/categories/{$categoryId}")
            ->assertOk();
    }

    public function test_stock_in_and_out_updates_the_stock_table_and_rejects_insufficient_stock(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        $item = $this->makeItem($tenant);
        $location = $this->makeLocation($tenant);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/stock/move', [
                'warehouse_item_id' => $item->id,
                'warehouse_location_id' => $location->id,
                'type' => 'in',
                'qty' => 50,
            ])
            ->assertCreated();

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/warehouse/stock')
            ->assertOk()
            ->assertJsonPath('data.0.qty', 50);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/stock/move', [
                'warehouse_item_id' => $item->id,
                'warehouse_location_id' => $location->id,
                'type' => 'out',
                'qty' => 20,
            ])
            ->assertCreated();

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/warehouse/stock')
            ->assertJsonPath('data.0.qty', 30);

        // Can't take out more than what's there.
        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/stock/move', [
                'warehouse_item_id' => $item->id,
                'warehouse_location_id' => $location->id,
                'type' => 'out',
                'qty' => 999,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('qty');
    }

    public function test_stock_transfer_moves_qty_between_locations_and_logs_both_legs(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        $item = $this->makeItem($tenant);
        $locationA = $this->makeLocation($tenant, 'Gudang A');
        $locationB = $this->makeLocation($tenant, 'Gudang B');

        $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/stock/move', [
            'warehouse_item_id' => $item->id,
            'warehouse_location_id' => $locationA->id,
            'type' => 'in',
            'qty' => 40,
        ])->assertCreated();

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/stock/transfer', [
                'warehouse_item_id' => $item->id,
                'from_location_id' => $locationA->id,
                'to_location_id' => $locationB->id,
                'qty' => 15,
            ])
            ->assertCreated();

        $stockByLocation = collect(
            $this->actingAs($owner, 'sanctum')->getJson('/api/warehouse/stock')->json('data')
        )->keyBy(fn ($row) => $row['location']['id']);

        $this->assertSame(25, $stockByLocation[$locationA->id]['qty']);
        $this->assertSame(15, $stockByLocation[$locationB->id]['qty']);

        $movements = $this->actingAs($owner, 'sanctum')->getJson('/api/warehouse/stock/movements')->json('data');
        $this->assertCount(3, $movements); // initial "in" + transfer's "out" + transfer's "in"
    }

    public function test_purchase_order_full_receive_marks_it_received_and_stocks_the_item(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        $item = $this->makeItem($tenant);
        $location = $this->makeLocation($tenant);
        $supplier = WarehouseSupplier::create(['tenant_id' => $tenant->id, 'name' => 'PT Supplier Jaya']);

        $poId = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/purchase-orders', [
                'warehouse_supplier_id' => $supplier->id,
                'receiving_location_id' => $location->id,
                'items' => [['warehouse_item_id' => $item->id, 'qty_ordered' => 30, 'unit_cost' => 5000]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'ordered')
            ->assertJsonPath('data.po_number', 'PO-0001')
            ->json('data.id');

        $poItemId = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/warehouse/purchase-orders/{$poId}")
            ->json('data.items.0.id');

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/warehouse/purchase-orders/{$poId}/receive", [
                'items' => [['po_item_id' => $poItemId, 'qty_received' => 30]],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'received');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/warehouse/stock')
            ->assertJsonPath('data.0.qty', 30);
    }

    public function test_purchase_order_partial_receive_and_over_receive_rejection(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        $item = $this->makeItem($tenant);
        $location = $this->makeLocation($tenant);
        $supplier = WarehouseSupplier::create(['tenant_id' => $tenant->id, 'name' => 'PT Supplier Jaya']);

        $po = $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/purchase-orders', [
            'warehouse_supplier_id' => $supplier->id,
            'receiving_location_id' => $location->id,
            'items' => [['warehouse_item_id' => $item->id, 'qty_ordered' => 30]],
        ])->assertCreated()->json('data');

        $poItemId = $po['items'][0]['id'];

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/warehouse/purchase-orders/{$po['id']}/receive", [
                'items' => [['po_item_id' => $poItemId, 'qty_received' => 10]],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'partially_received');

        // 25 more would exceed the remaining 20.
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/warehouse/purchase-orders/{$po['id']}/receive", [
                'items' => [['po_item_id' => $poItemId, 'qty_received' => 25]],
            ])
            ->assertStatus(422);
    }

    public function test_stock_opname_reconciles_physical_count_and_logs_the_difference(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        $item = $this->makeItem($tenant);
        $location = $this->makeLocation($tenant);

        $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/stock/move', [
            'warehouse_item_id' => $item->id,
            'warehouse_location_id' => $location->id,
            'type' => 'in',
            'qty' => 50,
        ])->assertCreated();

        // Physical count found only 45 — a shrinkage of 5.
        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/warehouse/stock-opname', [
                'warehouse_item_id' => $item->id,
                'warehouse_location_id' => $location->id,
                'physical_qty' => 45,
            ])
            ->assertCreated()
            ->assertJsonPath('data.system_qty', 50)
            ->assertJsonPath('data.physical_qty', 45)
            ->assertJsonPath('data.difference', -5);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/warehouse/stock')
            ->assertJsonPath('data.0.qty', 45);
    }

    public function test_operator_cannot_receive_purchase_orders(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        $operator = $this->makeUser($tenant, 'operator');
        $item = $this->makeItem($tenant);
        $location = $this->makeLocation($tenant);
        $supplier = WarehouseSupplier::create(['tenant_id' => $tenant->id, 'name' => 'PT Supplier Jaya']);

        $po = $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/purchase-orders', [
            'warehouse_supplier_id' => $supplier->id,
            'receiving_location_id' => $location->id,
            'items' => [['warehouse_item_id' => $item->id, 'qty_ordered' => 10]],
        ])->assertCreated()->json('data');

        $this->actingAs($operator, 'sanctum')
            ->patchJson("/api/warehouse/purchase-orders/{$po['id']}/receive", [
                'items' => [['po_item_id' => $po['items'][0]['id'], 'qty_received' => 10]],
            ])
            ->assertStatus(403);
    }

    public function test_a_tenants_warehouse_items_are_not_visible_to_another_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);
        $this->enableWarehouseModule($tenantA);
        $this->enableWarehouseModule($tenantB);
        $ownerB = $this->makeUser($tenantB, 'owner');
        $itemA = $this->makeItem($tenantA, 'Barang Rahasia Tenant A');

        $this->actingAs($ownerB, 'sanctum')
            ->getJson("/api/warehouse/items/{$itemA->id}")
            ->assertStatus(404);
    }
}
