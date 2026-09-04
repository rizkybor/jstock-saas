<?php

namespace Tests\Feature\Api\Warehouse;

use App\Models\Tenant;
use App\Models\TenantBarcodeSetting;
use App\Models\User;
use App\Models\WarehouseItem;
use App\Models\WarehouseLocation;
use App\Models\WarehouseStock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasWarehouseModule;
use Tests\TestCase;

class WarehouseItemBarcodeTest extends TestCase
{
    use HasWarehouseModule, RefreshDatabase;

    private function makeOwner(Tenant $tenant): User
    {
        return User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Owner',
            'email' => "owner-{$tenant->id}@test.local",
            'password' => 'password123',
            'role' => 'owner',
            'is_active' => true,
        ]);
    }

    public function test_creating_an_item_with_an_allowed_barcode_type_requires_and_keeps_its_sku(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeOwner($tenant);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'warehouse-item', 'enabled' => true, 'allowed_types' => ['qr']]);

        $response = $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/items', [
            'name' => 'Kardus Sedang',
            'sku' => 'SKU-001',
            'barcode_type' => 'qr',
        ])->assertCreated();

        $response->assertJsonPath('data.sku', 'SKU-001');
        $response->assertJsonPath('data.barcode_type', 'qr');
    }

    public function test_creating_an_item_with_a_barcode_type_but_no_sku_is_rejected(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeOwner($tenant);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'warehouse-item', 'enabled' => true, 'allowed_types' => ['qr']]);

        // A barcode encodes the sku directly — no sku means nothing to encode.
        $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/items', [
            'name' => 'Kardus Sedang',
            'barcode_type' => 'qr',
        ])->assertStatus(422)->assertJsonValidationErrors('sku');
    }

    public function test_creating_an_item_rejects_a_barcode_type_not_allowed_for_this_tenant(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeOwner($tenant);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'warehouse-item', 'enabled' => true, 'allowed_types' => ['qr']]);

        // "128" is a valid barcode type in general, but warehouse items are QR-only.
        $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/items', [
            'name' => 'Kardus Sedang',
            'sku' => 'SKU-001',
            'barcode_type' => '128',
        ])->assertStatus(422)->assertJsonValidationErrors('barcode_type');
    }

    public function test_an_item_can_be_looked_up_by_its_sku_for_a_barcode_scan(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeOwner($tenant);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'warehouse-item', 'enabled' => true, 'allowed_types' => ['qr']]);

        $item = $this->actingAs($owner, 'sanctum')->postJson('/api/warehouse/items', [
            'name' => 'Kardus Sedang',
            'sku' => 'SKU-001',
            'barcode_type' => 'qr',
        ])->json('data');

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/warehouse/items/lookup/{$item['sku']}")
            ->assertOk()
            ->assertJsonPath('data.id', $item['id']);
    }

    public function test_an_item_cannot_be_looked_up_by_sku_from_another_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);
        $this->enableWarehouseModule($tenantA);
        $this->enableWarehouseModule($tenantB);
        $ownerB = $this->makeOwner($tenantB);
        WarehouseItem::create(['tenant_id' => $tenantA->id, 'name' => 'Barang Tenant A', 'unit' => 'pcs', 'sku' => 'SKU-ISOLATED']);

        $this->actingAs($ownerB, 'sanctum')
            ->getJson('/api/warehouse/items/lookup/SKU-ISOLATED')
            ->assertStatus(404);
    }

    public function test_a_warehouse_item_can_be_scanned_publicly_without_authentication(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $item = WarehouseItem::create([
            'tenant_id' => $tenant->id,
            'name' => 'Kardus Sedang',
            'unit' => 'pcs',
            'sku' => 'SKU-PUBLICTEST',
            'barcode_type' => 'qr',
            'price_buy' => 15000,
            'price_sell' => 25000,
        ]);

        $this->getJson("/api/public/{$tenant->token}/warehouse/items/scan/{$item->sku}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Kardus Sedang')
            ->assertJsonPath('data.sku', 'SKU-PUBLICTEST')
            ->assertJsonMissingPath('data.price_buy')
            ->assertJsonMissingPath('data.price_sell');
    }

    public function test_a_public_warehouse_item_scan_includes_current_stock(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $item = WarehouseItem::create([
            'tenant_id' => $tenant->id,
            'name' => 'Kardus Sedang',
            'unit' => 'pcs',
            'sku' => 'SKU-STOCKTEST',
            'barcode_type' => 'qr',
        ]);
        $locationA = WarehouseLocation::create(['tenant_id' => $tenant->id, 'name' => 'Gudang A']);
        $locationB = WarehouseLocation::create(['tenant_id' => $tenant->id, 'name' => 'Gudang B']);
        WarehouseStock::create(['tenant_id' => $tenant->id, 'warehouse_item_id' => $item->id, 'warehouse_location_id' => $locationA->id, 'qty' => 30]);
        WarehouseStock::create(['tenant_id' => $tenant->id, 'warehouse_item_id' => $item->id, 'warehouse_location_id' => $locationB->id, 'qty' => 12]);

        // Stock is summed across every location the item is stocked in.
        $this->getJson("/api/public/{$tenant->token}/warehouse/items/scan/{$item->sku}")
            ->assertOk()
            ->assertJsonPath('data.total_stock', 42);
    }

    public function test_public_warehouse_item_scan_is_blocked_when_the_tenant_lacks_the_module(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $item = WarehouseItem::create(['tenant_id' => $tenant->id, 'name' => 'Kardus Sedang', 'unit' => 'pcs', 'sku' => 'SKU-NOMODULE']);

        $this->getJson("/api/public/{$tenant->token}/warehouse/items/scan/{$item->sku}")
            ->assertStatus(403);
    }

    public function test_tenant_can_read_effective_barcode_settings_without_a_module_specific_permission(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableWarehouseModule($tenant);
        $owner = $this->makeOwner($tenant);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'warehouse-item', 'enabled' => true, 'allowed_types' => ['qr']]);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/barcode-settings')
            ->assertOk()
            ->assertJsonPath('data.warehouse-item.enabled', true)
            ->assertJsonPath('data.warehouse-item.allowed_types', ['qr']);
    }
}
