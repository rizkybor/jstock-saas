<?php

namespace Tests\Feature\Api;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TenantProfileTest extends TestCase
{
    use RefreshDatabase;

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

    /**
     * Not tied to any module:<key> gate — should work for a tenant with no
     * module at all, an Inventory Gas Kalibrasi tenant, or a Warehouse
     * General tenant alike.
     */
    public function test_owner_can_view_and_update_the_company_profile_without_any_module(): void
    {
        $tenant = Tenant::create(['name' => 'CV Contoh', 'slug' => 'cv-contoh', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/tenant')
            ->assertOk()
            ->assertJsonPath('data.name', 'CV Contoh');

        $this->actingAs($owner, 'sanctum')
            ->putJson('/api/tenant', ['name' => 'CV Contoh Baru', 'email' => 'kontak@cvcontoh.test'])
            ->assertOk()
            ->assertJsonPath('data.name', 'CV Contoh Baru')
            ->assertJsonPath('data.email', 'kontak@cvcontoh.test');

        $this->assertSame('CV Contoh Baru', $tenant->fresh()->name);
    }

    public function test_manager_can_view_but_not_update_the_company_profile(): void
    {
        $tenant = Tenant::create(['name' => 'CV Contoh', 'slug' => 'cv-contoh', 'status' => 'trial']);
        $manager = $this->makeUser($tenant, 'manager');

        $this->actingAs($manager, 'sanctum')->getJson('/api/tenant')->assertOk();

        $this->actingAs($manager, 'sanctum')
            ->putJson('/api/tenant', ['name' => 'Coba Ubah'])
            ->assertStatus(403);
    }

    public function test_operator_cannot_view_the_company_profile(): void
    {
        $tenant = Tenant::create(['name' => 'CV Contoh', 'slug' => 'cv-contoh', 'status' => 'trial']);
        $operator = $this->makeUser($tenant, 'operator');

        $this->actingAs($operator, 'sanctum')->getJson('/api/tenant')->assertStatus(403);
    }

    public function test_owner_can_upload_and_remove_the_company_logo(): void
    {
        Storage::fake('public');
        $tenant = Tenant::create(['name' => 'CV Contoh', 'slug' => 'cv-contoh', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $response = $this->actingAs($owner, 'sanctum')
            ->postJson('/api/tenant/logo', ['logo' => UploadedFile::fake()->image('logo.png')])
            ->assertOk();

        $logoUrl = $response->json('data.logo_url');
        $this->assertNotNull($logoUrl);
        Storage::disk('public')->assertExists($tenant->fresh()->logo_path);

        // Uploading a second time replaces the first file instead of leaking it.
        $firstPath = $tenant->fresh()->logo_path;
        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/tenant/logo', ['logo' => UploadedFile::fake()->image('logo-2.png')])
            ->assertOk();
        Storage::disk('public')->assertMissing($firstPath);

        $this->actingAs($owner, 'sanctum')->deleteJson('/api/tenant/logo')->assertOk()->assertJsonPath('data.logo_url', null);
        $this->assertNull($tenant->fresh()->logo_path);
    }

    /**
     * AppLayout's sidebar branding reads this off /auth/me directly (not a
     * separate /tenant call) so it's available immediately on login without
     * flashing the default jstock branding first.
     */
    public function test_auth_me_exposes_the_tenant_logo_and_falls_back_to_null_without_one(): void
    {
        Storage::fake('public');
        $tenant = Tenant::create(['name' => 'CV Contoh', 'slug' => 'cv-contoh', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.tenant_name', 'CV Contoh')
            ->assertJsonPath('data.tenant_logo_url', null);

        $this->actingAs($owner, 'sanctum')->postJson('/api/tenant/logo', ['logo' => UploadedFile::fake()->image('logo.png')])->assertOk();

        $this->actingAs($owner->refresh(), 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.tenant_logo_url', fn ($url) => str_contains($url, 'storage/tenant-logos/'));
    }

    public function test_logo_upload_rejects_a_non_image_file(): void
    {
        Storage::fake('public');
        $tenant = Tenant::create(['name' => 'CV Contoh', 'slug' => 'cv-contoh', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/tenant/logo', ['logo' => UploadedFile::fake()->create('notes.pdf', 100)])
            ->assertStatus(422)
            ->assertJsonValidationErrors('logo');
    }
}
