<?php

namespace Tests\Feature\Api;

use App\Models\Client;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasInventoryModule;
use Tests\TestCase;

class ClientTenantIsolationTest extends TestCase
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

    public function test_users_cannot_view_another_tenants_client(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);
        $this->enableInventoryModule($tenantA);
        $this->enableInventoryModule($tenantB);

        $ownerA = $this->makeUser($tenantA, 'owner');
        $ownerB = $this->makeUser($tenantB, 'owner');

        $client = Client::create([
            'tenant_id' => $tenantA->id,
            'company_name' => 'PT Milik Tenant A',
            'pic_name' => 'Andi',
        ]);

        $this->actingAs($ownerB, 'sanctum')
            ->getJson("/api/clients/{$client->id}")
            ->assertStatus(404);

        $this->actingAs($ownerB, 'sanctum')
            ->getJson('/api/clients')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($ownerA, 'sanctum')
            ->getJson("/api/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('data.company_name', 'PT Milik Tenant A');
    }

    public function test_users_cannot_update_or_delete_another_tenants_client(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);
        $this->enableInventoryModule($tenantA);
        $this->enableInventoryModule($tenantB);
        $ownerB = $this->makeUser($tenantB, 'owner');

        $client = Client::create([
            'tenant_id' => $tenantA->id,
            'company_name' => 'PT Milik Tenant A',
            'pic_name' => 'Andi',
        ]);

        $this->actingAs($ownerB, 'sanctum')
            ->putJson("/api/clients/{$client->id}", ['phone' => 'hacked'])
            ->assertStatus(404);

        $this->actingAs($ownerB, 'sanctum')
            ->deleteJson("/api/clients/{$client->id}")
            ->assertStatus(404);

        $this->assertSame('PT Milik Tenant A', $client->fresh()->company_name);
        $this->assertTrue($client->fresh()->is_active);
    }

    public function test_viewer_cannot_create_or_delete_clients(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $viewer = $this->makeUser($tenant, 'viewer');

        $client = Client::create([
            'tenant_id' => $tenant->id,
            'company_name' => 'PT Contoh',
            'pic_name' => 'Andi',
        ]);

        $this->actingAs($viewer, 'sanctum')
            ->postJson('/api/clients', ['company_name' => 'Baru', 'pic_name' => 'X'])
            ->assertStatus(403);

        $this->actingAs($viewer, 'sanctum')
            ->deleteJson("/api/clients/{$client->id}")
            ->assertStatus(403);

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/clients')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_status_filter_returns_the_matching_clients_not_the_opposite(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        Client::create(['tenant_id' => $tenant->id, 'company_name' => 'PT Aktif', 'pic_name' => 'Andi', 'is_active' => true]);
        Client::create(['tenant_id' => $tenant->id, 'company_name' => 'PT Nonaktif', 'pic_name' => 'Budi', 'is_active' => false]);

        $active = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clients?status=active')
            ->assertOk()
            ->json('data');
        $this->assertCount(1, $active);
        $this->assertSame('PT Aktif', $active[0]['company_name']);

        $inactive = $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clients?status=inactive')
            ->assertOk()
            ->json('data');
        $this->assertCount(1, $inactive);
        $this->assertSame('PT Nonaktif', $inactive[0]['company_name']);
    }

    public function test_a_deactivated_client_can_be_reactivated_via_update(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeUser($tenant, 'owner');
        $client = Client::create(['tenant_id' => $tenant->id, 'company_name' => 'PT Contoh', 'pic_name' => 'Andi', 'is_active' => false]);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/clients/{$client->id}", ['is_active' => true])
            ->assertOk()
            ->assertJsonPath('data.is_active', true);

        $this->assertTrue($client->fresh()->is_active);
    }

    public function test_tenant_without_the_module_cannot_access_clients(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant C', 'slug' => 'tenant-c', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/clients')
            ->assertStatus(403);
    }
}
