<?php

namespace Tests\Feature\Api;

use App\Models\Client;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientTenantIsolationTest extends TestCase
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

    public function test_users_cannot_view_another_tenants_client(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);

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
}
