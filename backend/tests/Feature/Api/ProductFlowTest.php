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

    public function test_creating_a_product_derives_unit_cost_from_its_jenis_gas(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%', 'unit_cost' => 145000]);

        $response = $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'product_series_id' => $series->id,
            'quantity' => 10,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.unit_cost', 145000)
            ->assertJsonPath('data.grand_total_cost', 1450000)
            ->assertJsonPath('data.cogs', 145000)
            ->assertJsonPath('data.series.name', 'CH4 — 2.5%');
    }

    public function test_a_jenis_gas_without_a_unit_cost_cannot_be_used_to_create_a_product(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'Belum Ada Harga']);

        $this->actingAs($owner, 'sanctum')->postJson('/api/products', [
            'name' => 'Gas Tanpa Harga',
            'product_series_id' => $series->id,
            'quantity' => 5,
        ])->assertStatus(422);
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
