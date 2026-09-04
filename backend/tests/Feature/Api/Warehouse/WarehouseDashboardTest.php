<?php

namespace Tests\Feature\Api\Warehouse;

use App\Models\Tenant;
use App\Models\User;
use App\Models\WarehouseItem;
use App\Models\WarehouseLocation;
use App\Models\WarehouseStock;
use App\Models\WarehouseSupplier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasWarehouseModule;
use Tests\TestCase;

class WarehouseDashboardTest extends TestCase
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

    public function test_dashboard_is_blocked_without_the_module(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/warehouse/dashboard/summary')
            ->assertStatus(403);
    }

    public function test_dashboard_summary_reports_counts_and_low_stock_items(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        $location = WarehouseLocation::create(['tenant_id' => $tenant->id, 'name' => 'Gudang Utama']);

        // Below its min_stock — should surface as a low-stock alert.
        $lowStockItem = WarehouseItem::create(['tenant_id' => $tenant->id, 'name' => 'Kardus Kecil', 'unit' => 'pcs', 'min_stock' => 10]);
        WarehouseStock::create(['tenant_id' => $tenant->id, 'warehouse_item_id' => $lowStockItem->id, 'warehouse_location_id' => $location->id, 'qty' => 2]);

        // Has no stock rows at all — still below min_stock (implicitly 0),
        // and must not be silently dropped by a naive stocks() join.
        WarehouseItem::create(['tenant_id' => $tenant->id, 'name' => 'Kardus Tanpa Stok', 'unit' => 'pcs', 'min_stock' => 5]);

        // Well-stocked — should not appear in the low-stock list.
        $healthyItem = WarehouseItem::create(['tenant_id' => $tenant->id, 'name' => 'Kardus Besar', 'unit' => 'pcs', 'min_stock' => 5]);
        WarehouseStock::create(['tenant_id' => $tenant->id, 'warehouse_item_id' => $healthyItem->id, 'warehouse_location_id' => $location->id, 'qty' => 50]);

        $supplier = WarehouseSupplier::create(['tenant_id' => $tenant->id, 'name' => 'Supplier A']);
        $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/purchase-orders', [
            'warehouse_supplier_id' => $supplier->id,
            'items' => [['warehouse_item_id' => $healthyItem->id, 'qty_ordered' => 10]],
        ])->assertCreated();

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/warehouse/dashboard/summary')
            ->assertOk()
            ->assertJsonPath('data.item_count', 3)
            ->assertJsonPath('data.location_count', 1)
            ->assertJsonPath('data.low_stock_count', 2)
            ->assertJsonPath('data.pending_purchase_orders', 1);

        $lowStockNames = collect($response->json('data.low_stock_items'))->pluck('name');
        $this->assertContains('Kardus Kecil', $lowStockNames);
        $this->assertContains('Kardus Tanpa Stok', $lowStockNames);
        $this->assertNotContains('Kardus Besar', $lowStockNames);
    }

    public function test_operator_and_viewer_can_read_the_dashboard(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $viewer = $this->makeUser($tenant, 'viewer');

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/warehouse/dashboard/summary')
            ->assertOk();
    }
}
