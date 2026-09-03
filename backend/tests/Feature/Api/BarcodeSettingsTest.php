<?php

namespace Tests\Feature\Api;

use App\Models\Tenant;
use App\Models\TenantBarcodeSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasInventoryModule;
use Tests\TestCase;

class BarcodeSettingsTest extends TestCase
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

    public function test_a_tenant_can_read_its_own_effective_barcode_settings(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $viewer = $this->makeUser($tenant, 'viewer');
        TenantBarcodeSetting::create(['tenant_id' => $tenant->id, 'feature' => 'product', 'enabled' => true, 'allowed_types' => ['qr']]);

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/barcode-settings')
            ->assertOk()
            ->assertJsonPath('data.product.enabled', true)
            ->assertJsonPath('data.product.allowed_types', ['qr'])
            ->assertJsonPath('data.transaction.enabled', false);
    }

    public function test_a_tenant_only_sees_its_own_barcode_settings(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);
        $this->enableInventoryModule($tenantA);
        $this->enableInventoryModule($tenantB);
        $ownerB = $this->makeUser($tenantB, 'owner');
        TenantBarcodeSetting::create(['tenant_id' => $tenantA->id, 'feature' => 'product', 'enabled' => true, 'allowed_types' => ['qr']]);

        $this->actingAs($ownerB, 'sanctum')
            ->getJson('/api/barcode-settings')
            ->assertOk()
            ->assertJsonPath('data.product.enabled', false)
            ->assertJsonPath('data.product.allowed_types', []);
    }
}
