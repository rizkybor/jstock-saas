<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PlanManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeSuperAdmin(): User
    {
        return User::create([
            'tenant_id' => null,
            'name' => 'Admin jstock',
            'email' => 'admin@jstock.test',
            'password' => 'password123',
            'role' => 'super_admin',
            'is_active' => true,
        ]);
    }

    public function test_super_admin_can_create_and_list_plans(): void
    {
        $admin = $this->makeSuperAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/admin/plans', [
                'name' => 'Pro',
                'price' => 500000,
                'max_users' => 20,
                'max_transactions_per_month' => 1000,
                'features' => ['Multi-user', 'Export laporan'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'pro');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/plans')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Pro');
    }

    public function test_subscription_endpoint_returns_null_data_for_a_tenant_with_no_subscription(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/subscription")
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_super_admin_can_change_a_tenants_plan(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $pro = Plan::create(['name' => 'Pro', 'slug' => 'pro', 'price' => 500000, 'max_users' => 20]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/subscription", [
                'plan_id' => $pro->id,
                'status' => 'active',
                'ends_at' => '2027-01-01',
            ])
            ->assertOk()
            ->assertJsonPath('data.plan.name', 'Pro')
            ->assertJsonPath('data.status', 'active');

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/subscription")
            ->assertOk()
            ->assertJsonPath('data.plan.slug', 'pro');
    }

    public function test_only_super_admin_can_manage_plans(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = User::create([
            'tenant_id' => $tenant->id, 'name' => 'Owner', 'email' => 'owner@tenant-a.test',
            'password' => 'password123', 'role' => 'owner', 'is_active' => true,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/admin/plans')
            ->assertStatus(403);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/subscription", ['plan_id' => 1, 'status' => 'active'])
            ->assertStatus(403);
    }
}
