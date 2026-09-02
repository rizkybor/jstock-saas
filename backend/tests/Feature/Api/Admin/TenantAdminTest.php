<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantAdminTest extends TestCase
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

    public function test_super_admin_can_list_and_view_every_tenant(): void
    {
        $admin = $this->makeSuperAdmin();
        Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'active']);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/tenants')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_regular_owner_cannot_access_admin_endpoints(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeOwner($tenant);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/admin/tenants')
            ->assertStatus(403);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/admin/tenants/{$tenant->id}/suspend")
            ->assertStatus(403);
    }

    public function test_suspending_a_tenant_blocks_its_users_from_logging_in(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->makeOwner($tenant);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/tenants/{$tenant->id}/suspend")
            ->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $this->postJson('/api/auth/login', [
            'email' => "owner-{$tenant->id}@test.local",
            'password' => 'password123',
        ])->assertStatus(403);

        $this->actingAs($admin, 'sanctum')
            ->patchJson("/api/admin/tenants/{$tenant->id}/activate")
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        $this->postJson('/api/auth/login', [
            'email' => "owner-{$tenant->id}@test.local",
            'password' => 'password123',
        ])->assertOk();
    }

    public function test_admin_stats_counts_across_all_tenants(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'suspended']);
        $this->makeOwner($tenantA);
        $this->makeOwner($tenantB);

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('data.total_tenants', 2)
            ->assertJsonPath('data.suspended_tenants', 1)
            ->assertJsonPath('data.total_users', 2);
    }
}
