<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Module;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantCrudTest extends TestCase
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

    public function test_super_admin_can_create_a_tenant_with_an_owner_and_modules(): void
    {
        $admin = $this->makeSuperAdmin();
        $module = Module::create(['key' => 'inventory-gas-kalibrasi', 'name' => 'Inventory Gas Kalibrasi']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/admin/tenants', [
            'name' => 'PT Baru Dibuat Admin',
            'email' => 'kontak@ptbaru.test',
            'owner_name' => 'Owner Baru',
            'owner_email' => 'owner-baru@ptbaru.test',
            'owner_password' => 'password123',
            'module_ids' => [$module->id],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'PT Baru Dibuat Admin')
            ->assertJsonPath('data.modules.0.key', 'inventory-gas-kalibrasi');

        $this->assertDatabaseHas('users', ['email' => 'owner-baru@ptbaru.test', 'role' => 'owner']);

        $owner = User::where('email', 'owner-baru@ptbaru.test')->first();
        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clients')
            ->assertOk();
    }

    public function test_super_admin_can_update_a_tenants_profile(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant Lama', 'slug' => 'tenant-lama', 'status' => 'trial']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}", ['name' => 'Tenant Baru', 'phone' => '0812345'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Tenant Baru')
            ->assertJsonPath('data.phone', '0812345');

        $this->assertSame('Tenant Baru', $tenant->fresh()->name);
    }

    public function test_super_admin_can_update_a_tenants_wilayah_address(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant Lama', 'slug' => 'tenant-lama', 'status' => 'trial']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}", [
                'address' => 'Jl. Contoh No. 1',
                'province_id' => '31',
                'province_name' => 'DKI Jakarta',
                'regency_id' => '3171',
                'regency_name' => 'Kota Jakarta Selatan',
                'district_id' => '317101',
                'district_name' => 'Kebayoran Baru',
                'village_id' => '3171011001',
                'village_name' => 'Selong',
            ])
            ->assertOk()
            ->assertJsonPath('data.address', 'Jl. Contoh No. 1')
            ->assertJsonPath('data.province_name', 'DKI Jakarta')
            ->assertJsonPath('data.regency_name', 'Kota Jakarta Selatan')
            ->assertJsonPath('data.district_name', 'Kebayoran Baru')
            ->assertJsonPath('data.village_name', 'Selong');
    }

    public function test_only_super_admin_can_create_or_update_tenants(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeOwner($tenant);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/admin/tenants', ['name' => 'X', 'owner_name' => 'X', 'owner_email' => 'x@x.test', 'owner_password' => 'password123'])
            ->assertStatus(403);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}", ['name' => 'Hacked'])
            ->assertStatus(403);
    }

    public function test_tenant_urls_use_an_encrypted_token_not_the_raw_id(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/admin/tenants')
            ->assertOk();

        $token = $response->json('data.0.token');

        $this->assertNotSame((string) $tenant->id, $token);
        $this->assertSame($tenant->id, TenantToken::decode($token));

        // The raw numeric id is no longer a valid identifier for this route.
        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->id}")
            ->assertStatus(404);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$token}")
            ->assertOk();
    }

    public function test_users_own_tenant_token_matches_the_admin_facing_token(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeOwner($tenant);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk();

        $this->assertSame($tenant->token, $response->json('data.tenant_token'));
    }
}
