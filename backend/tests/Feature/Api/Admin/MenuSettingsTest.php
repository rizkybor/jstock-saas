<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Module;
use App\Models\Tenant;
use App\Models\TenantMenuSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MenuSettingsTest extends TestCase
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

    public function test_menus_default_to_enabled_when_no_override_exists(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/modules/{$module->id}/menu-settings")
            ->assertOk()
            ->assertJsonPath('data.module_key', 'inventory-gas-kalibrasi');

        $menus = collect($response->json('data.menus'))->keyBy('key');
        $this->assertTrue($menus['clients']['enabled']);
        $this->assertTrue($menus['transactions']['enabled']);
        $this->assertSame(['dashboard', 'clients', 'products', 'transactions', 'reports'], $menus->keys()->all());
    }

    public function test_super_admin_can_disable_a_specific_menu_for_a_tenant(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);
        $tenant->modules()->attach($module->id);
        $owner = $this->makeOwner($tenant);

        $this->actingAs($owner, 'sanctum')->getJson('/api/clients')->assertOk();

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/modules/{$module->id}/menu-settings", [
                'menus' => ['clients' => false],
            ])
            ->assertOk()
            ->assertJsonPath('data.menus.1.key', 'clients')
            ->assertJsonPath('data.menus.1.enabled', false);

        // The disabled menu is now blocked...
        $this->actingAs($owner->refresh(), 'sanctum')->getJson('/api/clients')->assertStatus(403);

        // ...but every other menu in the same module is untouched.
        $this->actingAs($owner->refresh(), 'sanctum')->getJson('/api/transactions')->assertOk();
    }

    public function test_re_enabling_a_menu_restores_access(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);
        $tenant->modules()->attach($module->id);
        $owner = $this->makeOwner($tenant);
        TenantMenuSetting::create([
            'tenant_id' => $tenant->id, 'module_key' => 'inventory-gas-kalibrasi', 'menu_key' => 'products', 'enabled' => false,
        ]);

        $this->actingAs($owner, 'sanctum')->getJson('/api/products')->assertStatus(403);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/modules/{$module->id}/menu-settings", [
                'menus' => ['products' => true],
            ])
            ->assertOk();

        $this->actingAs($owner->refresh(), 'sanctum')->getJson('/api/products')->assertOk();
    }

    public function test_only_super_admin_can_manage_menu_settings(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);
        $owner = $this->makeOwner($tenant);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/modules/{$module->id}/menu-settings")
            ->assertStatus(403);
    }

    public function test_a_module_with_no_known_menu_catalog_returns_404(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $module = Module::create(['key' => 'future-module', 'name' => 'Future Module']);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/modules/{$module->id}/menu-settings")
            ->assertStatus(404);
    }

    public function test_auth_me_exposes_granted_modules_and_effective_menus(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);
        $tenant->modules()->attach($module->id);
        TenantMenuSetting::create([
            'tenant_id' => $tenant->id, 'module_key' => 'inventory-gas-kalibrasi', 'menu_key' => 'reports', 'enabled' => false,
        ]);
        $owner = $this->makeOwner($tenant);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.modules.0', 'inventory-gas-kalibrasi')
            ->assertJsonPath('data.menus.clients', true)
            ->assertJsonPath('data.menus.reports', false);
    }
}
