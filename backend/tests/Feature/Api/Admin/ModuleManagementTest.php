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

    public function test_deactivating_a_module_in_the_catalog_blocks_every_tenant_that_has_it(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeOwner($tenant);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi', 'is_active' => true]);
        $tenant->modules()->attach($module->id);

        $this->actingAs($owner, 'sanctum')->getJson('/api/clients')->assertOk();

        // No per-tenant detach needed — flipping the catalog entry off
        // takes effect immediately for every tenant that has it.
        $module->update(['is_active' => false]);

        $this->actingAs($owner, 'sanctum')->getJson('/api/clients')->assertStatus(403);
    }

    public function test_a_suspended_tenants_existing_token_can_no_longer_reach_module_routes(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'active']);
        $owner = $this->makeOwner($tenant);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);
        $tenant->modules()->attach($module->id);

        // Sanity check: access works before suspension.
        $this->actingAs($owner, 'sanctum')->getJson('/api/clients')->assertOk();

        // Suspending doesn't revoke the token, but the module gate must
        // still cut off business access on the very next request.
        $tenant->update(['status' => 'suspended']);

        // actingAs() pins one PHP user instance for the guard across every
        // call in this test, and Eloquent caches a loaded belongsTo
        // relation on that instance — refresh() clears that cache so this
        // assertion reflects what a real, freshly-authenticated request
        // would see (a real request always resolves the user from scratch).
        $this->actingAs($owner->refresh(), 'sanctum')->getJson('/api/clients')->assertStatus(403);
    }
}
