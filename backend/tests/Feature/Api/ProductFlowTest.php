<?php

namespace Tests\Feature\Api;

use App\Models\ProductSeries;
use App\Models\Tenant;
use App\Models\User;
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
}
