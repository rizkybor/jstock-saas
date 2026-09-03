<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Tenant;
use App\Models\TenantBarcodeSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BarcodeSettingsTest extends TestCase
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

    public function test_barcode_settings_default_to_disabled_with_no_types(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        $this->actingAs($admin, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/barcode-settings")
            ->assertOk()
            ->assertJsonPath('data.product.enabled', false)
            ->assertJsonPath('data.product.allowed_types', [])
            ->assertJsonPath('data.transaction.enabled', false)
            ->assertJsonPath('data.transaction.allowed_types', []);
    }

    public function test_super_admin_can_configure_barcode_settings_per_feature(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/barcode-settings", [
                'product' => ['enabled' => true, 'allowed_types' => ['qr']],
                'transaction' => ['enabled' => true, 'allowed_types' => ['39']],
            ])
            ->assertOk()
            ->assertJsonPath('data.product.enabled', true)
            ->assertJsonPath('data.product.allowed_types', ['qr'])
            ->assertJsonPath('data.transaction.enabled', true)
            ->assertJsonPath('data.transaction.allowed_types', ['39']);

        $this->assertSame(2, TenantBarcodeSetting::where('tenant_id', $tenant->id)->count());
    }

    public function test_barcode_settings_reject_unknown_types(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/barcode-settings", [
                'product' => ['enabled' => true, 'allowed_types' => ['itf-14']],
                'transaction' => ['enabled' => false, 'allowed_types' => []],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('product.allowed_types.0');
    }

    public function test_barcode_settings_reject_a_type_not_allowed_for_that_feature(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);

        // "128" is a valid barcode type, but product labels are QR-only.
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/barcode-settings", [
                'product' => ['enabled' => true, 'allowed_types' => ['128']],
                'transaction' => ['enabled' => false, 'allowed_types' => []],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('product.allowed_types.0');

        // "qr" is valid too, but transaction labels are Code128/39-only.
        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/barcode-settings", [
                'product' => ['enabled' => false, 'allowed_types' => []],
                'transaction' => ['enabled' => true, 'allowed_types' => ['qr']],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('transaction.allowed_types.0');
    }

    public function test_only_super_admin_can_manage_barcode_settings(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeOwner($tenant);

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/barcode-settings")
            ->assertStatus(403);
    }
}
