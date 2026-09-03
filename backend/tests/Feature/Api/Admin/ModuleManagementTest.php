<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Module;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModuleManagementTest extends TestCase
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

    public function test_super_admin_can_grant_and_revoke_a_module_for_a_tenant(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeOwner($tenant);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);

        // Not granted yet — tenant's own users are blocked from the module's routes.
        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clients')
            ->assertStatus(403);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/modules")
            ->assertOk()
            ->assertJsonPath('data.0.key', 'inventory-gas-kalibrasi')
            ->assertJsonPath('data.0.enabled', false);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->token}/modules/{$module->id}")
            ->assertOk();

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clients')
            ->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/tenants/{$tenant->token}/modules/{$module->id}")
            ->assertOk();

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clients')
            ->assertStatus(403);
    }

    public function test_registering_a_new_tenant_auto_grants_the_default_module(): void
    {
        Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);

        $response = $this->postJson('/api/auth/register', [
            'company_name' => 'PT Contoh Baru',
            'name' => 'Owner Baru',
            'email' => 'owner-baru@test.local',
            'password' => 'password123',
        ])->assertCreated();

        $token = $response->json('data.token');

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/clients')
            ->assertOk();
    }

    public function test_only_super_admin_can_manage_modules(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeOwner($tenant);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/admin/modules')
            ->assertStatus(403);

        $this->actingAs($owner, 'sanctum')
            ->postJson("/api/admin/tenants/{$tenant->token}/modules/{$module->id}")
            ->assertStatus(403);
    }
}
