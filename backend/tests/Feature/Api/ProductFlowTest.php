<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\ProductSeries;
use App\Models\Tenant;
use App\Models\TenantBarcodeSetting;
use App\Models\User;
use App\Support\Gtin14;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasInventoryModule;
use Tests\TestCase;

class ProductFlowTest extends TestCase
{
    use HasInventoryModule, RefreshDatabase;

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

    public function test_creating_a_product_uses_the_submitted_unit_cost(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%', 'unit_cost' => 145000]);

        $response = $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'product_series_id' => $series->id,
            'unit_cost' => 150000,
            'quantity' => 10,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.unit_cost', 150000)
            ->assertJsonPath('data.grand_total_cost', 1500000)
            ->assertJsonPath('data.cogs', 150000)
            ->assertJsonPath('data.series.name', 'CH4 — 2.5%');
    }

    public function test_additional_cost_is_included_in_grand_total_and_persists_across_edits(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%']);

        $productId = $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'product_series_id' => $series->id,
            'unit_cost' => 100000,
            'quantity' => 10,
            'additional_cost' => 50000,
        ])->assertCreated()
            ->assertJsonPath('data.additional_cost', 50000)
            ->assertJsonPath('data.grand_total_cost', 1050000) // (100000*10)+50000
            ->assertJsonPath('data.cogs', 105000) // 1050000/10
            ->json('data.id');

        // Editing quantity alone (no unit_cost re-sent) must keep the
        // additional_cost baked into the recalculation, not silently drop it.
        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/products/{$productId}", ['stock_qty' => 5])
            ->assertOk()
            ->assertJsonPath('data.grand_total_cost', 550000) // (100000*5)+50000
            ->assertJsonPath('data.additional_cost', 50000);
    }

    public function test_unit_cost_is_required_to_create_a_product(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%']);

        $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Tanpa Harga',
            'product_series_id' => $series->id,
            'quantity' => 5,
        ])->assertStatus(422)
            ->assertJsonValidationErrors('unit_cost');
    }

    public function test_jenis_gas_is_required_to_create_a_product(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);

        $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Tanpa Jenis',
            'quantity' => 5,
        ])->assertStatus(422)
            ->assertJsonValidationErrors('product_series_id');
    }

    public function test_creating_a_product_with_an_allowed_barcode_type_autogenerates_a_unique_id(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%']);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'product', 'enabled' => true, 'allowed_types' => ['qr', '128']]);

        $response = $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'product_series_id' => $series->id,
            'unit_cost' => 100000,
            'quantity' => 10,
            'barcode_type' => 'qr',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.barcode_type', 'qr');
        $this->assertNotEmpty($response->json('data.unique_id'));
    }

    public function test_creating_a_product_rejects_a_barcode_type_not_allowed_for_this_tenant(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%']);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'product', 'enabled' => true, 'allowed_types' => ['qr']]);

        $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'product_series_id' => $series->id,
            'unit_cost' => 100000,
            'quantity' => 10,
            'barcode_type' => '128',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('barcode_type');
    }

    public function test_editing_a_product_to_add_a_barcode_type_autogenerates_a_unique_id_if_missing(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%']);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'product', 'enabled' => true, 'allowed_types' => ['39']]);

        $productId = $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'product_series_id' => $series->id,
            'unit_cost' => 100000,
            'quantity' => 10,
        ])->assertCreated()
            ->assertJsonPath('data.unique_id', null)
            ->json('data.id');

        $response = $this->actingAs($owner, 'sanctum')
            ->putJson("/api/products/{$productId}", ['barcode_type' => '39'])
            ->assertOk()
            ->assertJsonPath('data.barcode_type', '39');

        $this->assertNotEmpty($response->json('data.unique_id'));
    }

    public function test_a_product_can_be_looked_up_by_its_unique_id_for_a_barcode_scan(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%']);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'product', 'enabled' => true, 'allowed_types' => ['qr']]);

        $productId = $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'product_series_id' => $series->id,
            'unit_cost' => 100000,
            'quantity' => 10,
            'barcode_type' => 'qr',
        ])->assertCreated()->json('data');

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/products/lookup/{$productId['unique_id']}")
            ->assertOk()
            ->assertJsonPath('data.id', $productId['id']);
    }

    public function test_a_product_can_be_looked_up_by_its_itf14_gtin(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%']);
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'product', 'enabled' => true, 'allowed_types' => ['itf14']]);

        $product = $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'product_series_id' => $series->id,
            'unit_cost' => 100000,
            'quantity' => 10,
            'barcode_type' => 'itf14',
        ])->assertCreated()->json('data');

        // ITF-14 encodes a GTIN-14 derived from the id, not the alphanumeric
        // unique_id — a scan carries that GTIN, and lookup must decode it.
        $gtin = Gtin14::encode($product['id']);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/products/lookup/{$gtin}")
            ->assertOk()
            ->assertJsonPath('data.id', $product['id']);
    }

    public function test_a_product_cannot_be_looked_up_by_unique_id_from_another_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);
        $this->enableInventoryModule($tenantA);
        $this->enableInventoryModule($tenantB);
        $ownerB = $this->makeOwner($tenantB);
        Product::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Barang Tenant A',
            'unique_id' => 'BRG-ISOLATED',
            'unit_cost' => 1000,
            'grand_total_cost' => 1000,
            'cogs' => 1000,
            'stock_qty' => 1,
        ]);

        $this->actingAs($ownerB, 'sanctum')
            ->getJson('/api/products/lookup/BRG-ISOLATED')
            ->assertStatus(404);
    }
}
