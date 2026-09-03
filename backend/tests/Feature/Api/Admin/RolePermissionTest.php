<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Client;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasInventoryModule;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use HasInventoryModule, RefreshDatabase;

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

    public function test_role_list_only_includes_roles_actually_used_by_the_tenants_accounts(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->makeUser($tenant, 'owner');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/roles")
            ->assertOk();

        $roles = collect($response->json('data'))->pluck('role');
        $this->assertEquals(['owner'], $roles->all());

        $owner = collect($response->json('data'))->firstWhere('role', 'owner');
        $this->assertFalse($owner['is_custom']);
        $this->assertContains('clients.delete', $owner['permissions']);
    }

    public function test_a_custom_job_title_role_starts_with_no_permissions_until_super_admin_grants_some(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->makeUser($tenant, 'supervisor_gudang');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/roles")
            ->assertOk();

        $role = collect($response->json('data'))->firstWhere('role', 'supervisor_gudang');
        $this->assertFalse($role['is_custom']);
        $this->assertSame([], $role['permissions']);
    }

    public function test_super_admin_can_grant_extra_permission_and_it_takes_effect_immediately(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $viewer = $this->makeUser($tenant, 'viewer');
        $client = Client::create(['tenant_id' => $tenant->id, 'company_name' => 'PT Contoh', 'pic_name' => 'Andi']);

        // Viewer can't delete by default.
        $this->actingAs($viewer, 'sanctum')
            ->deleteJson("/api/clients/{$client->id}")
            ->assertStatus(403);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/roles/viewer", [
                'permissions' => ['clients.view', 'clients.delete'],
            ])
            ->assertOk()
            ->assertJsonPath('data.role', 'viewer');

        // Same viewer user, same token — permission is re-evaluated per request.
        $this->actingAs($viewer, 'sanctum')
            ->deleteJson("/api/clients/{$client->id}")
            ->assertOk();
    }

    public function test_reset_restores_the_platform_default(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $viewer = $this->makeUser($tenant, 'viewer');
        $client = Client::create(['tenant_id' => $tenant->id, 'company_name' => 'PT Contoh', 'pic_name' => 'Andi']);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/tenants/{$tenant->token}/roles/viewer", [
            'permissions' => ['clients.view', 'clients.delete'],
        ])->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/tenants/{$tenant->token}/roles/viewer")
            ->assertOk();

        $this->actingAs($viewer, 'sanctum')
            ->deleteJson("/api/clients/{$client->id}")
            ->assertStatus(403);
    }

    public function test_cannot_manage_a_role_no_account_in_the_tenant_actually_uses(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->makeUser($tenant, 'owner');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/roles/viewer", ['permissions' => []])
            ->assertStatus(404);
    }

    public function test_only_super_admin_can_manage_roles(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/permissions/catalog")
            ->assertStatus(403);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/roles/owner", ['permissions' => []])
            ->assertStatus(403);
    }

    public function test_catalog_groups_permissions_by_module(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/permissions/catalog")
            ->assertOk();

        $modules = collect($response->json('data'))->pluck('module');
        $this->assertContains('clients', $modules);
        $this->assertContains('transactions', $modules);
    }

    public function test_catalog_only_shows_permission_groups_for_the_tenants_active_module(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/permissions/catalog")
            ->assertOk();

        $modules = collect($response->json('data'))->pluck('module');
        $this->assertContains('clients', $modules);
        // No warehouse-general module for this tenant, so its permission
        // groups must not appear in the checklist.
        $this->assertNotContains('warehouse-locations', $modules);

        // Core, non-module-specific groups are always shown.
        $this->assertContains('tenant', $modules);
        $this->assertContains('users', $modules);
    }
}
