<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasInventoryModule;
use Tests\TestCase;

class DashboardReportTest extends TestCase
{
    use HasInventoryModule, RefreshDatabase;

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

    public function test_dashboard_summary_reflects_real_data(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');

        Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Gas A',
            'lot_batch' => 'LOT-1',
            'unit_cost' => 100,
            'grand_total_cost' => 1000,
            'cogs' => 100,
            'stock_qty' => 10,
        ]);

        $this->actingAs($owner, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'no_invoice' => true,
            'items' => [['product_id' => 1, 'qty' => 1]],
        ])->assertCreated();

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/dashboard/summary')
            ->assertOk();

        $response->assertJsonPath('data.item_count', 1)
            ->assertJsonPath('data.pending_count', 1)
            ->assertJsonCount(1, 'data.pending_transactions');
    }

    public function test_report_summary_reflects_real_data(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');

        Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Gas A',
            'lot_batch' => 'LOT-1',
            'unit_cost' => 100,
            'grand_total_cost' => 1000,
            'cogs' => 100,
            'stock_qty' => 10,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/reports/summary')
            ->assertOk()
            ->assertJsonPath('data.total_products', 1)
            ->assertJsonPath('data.total_stock_value', 1000)
            ->assertJsonPath('data.transactions_pending', 0);
    }

    public function test_dashboard_and_reports_are_gated_by_the_module(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')->getJson('/api/dashboard/summary')->assertStatus(403);
        $this->actingAs($owner, 'sanctum')->getJson('/api/reports/summary')->assertStatus(403);
    }
}
