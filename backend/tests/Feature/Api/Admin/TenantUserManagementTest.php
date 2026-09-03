<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantUserManagementTest extends TestCase
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

    public function test_super_admin_can_create_a_tenant_account_with_any_role_name(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->token}/users", [
                'name' => 'Rudi Hartono',
                'email' => 'rudi@tenant-a.test',
                'password' => 'password123',
                'role' => 'supervisor_qc',
            ])
            ->assertCreated()
            ->assertJsonPath('data.role', 'supervisor_qc');

        $this->assertDatabaseHas('users', [
            'email' => 'rudi@tenant-a.test',
            'tenant_id' => $tenant->id,
            'role' => 'supervisor_qc',
        ]);

        $roles = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/roles")
            ->assertOk()
            ->json('data');

        $this->assertContains('supervisor_qc', collect($roles)->pluck('role'));
    }

    public function test_super_admin_can_update_and_delete_tenant_accounts(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = User::create([
            'tenant_id' => $tenant->id, 'name' => 'Owner', 'email' => 'owner@tenant-a.test',
            'password' => 'password123', 'role' => 'owner', 'is_active' => true,
        ]);
        $second = User::create([
            'tenant_id' => $tenant->id, 'name' => 'Second', 'email' => 'second@tenant-a.test',
            'password' => 'password123', 'role' => 'manager', 'is_active' => true,
        ]);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/users/{$second->id}", [
                'name' => 'Second Renamed',
                'email' => 'second@tenant-a.test',
                'role' => 'manager',
                'is_active' => false,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Second Renamed')
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/tenants/{$tenant->token}/users/{$second->id}")
            ->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $second->id]);

        // Can't delete the last remaining account for a tenant.
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/tenants/{$tenant->token}/users/{$owner->id}")
            ->assertStatus(422);
    }

    public function test_a_user_cannot_be_created_with_the_super_admin_role(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->token}/users", [
                'name' => 'Sneaky',
                'email' => 'sneaky@tenant-a.test',
                'password' => 'password123',
                'role' => 'super_admin',
            ])
            ->assertStatus(422);
    }

    public function test_only_super_admin_can_manage_tenant_accounts(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = User::create([
            'tenant_id' => $tenant->id, 'name' => 'Owner', 'email' => 'owner@tenant-a.test',
            'password' => 'password123', 'role' => 'owner', 'is_active' => true,
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/users")
            ->assertStatus(403);
    }
}
