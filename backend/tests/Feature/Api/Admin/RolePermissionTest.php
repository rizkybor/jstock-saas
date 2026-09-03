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

    public function test_tenant_roles_default_to_the_platform_matrix(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/roles")
            ->assertOk();

        $viewer = collect($response->json('data'))->firstWhere('role', 'viewer');
        $this->assertFalse($viewer['is_custom']);
        $this->assertNotContains('clients.delete', $viewer['permissions']);
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

    public function test_only_super_admin_can_manage_roles(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/admin/permissions/catalog')
            ->assertStatus(403);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/roles/viewer", ['permissions' => []])
            ->assertStatus(403);
    }

    public function test_catalog_groups_permissions_by_module(): void
    {
        $admin = $this->makeSuperAdmin();

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/permissions/catalog')
            ->assertOk();

        $modules = collect($response->json('data'))->pluck('module');
        $this->assertContains('clients', $modules);
        $this->assertContains('transactions', $modules);
    }
}
