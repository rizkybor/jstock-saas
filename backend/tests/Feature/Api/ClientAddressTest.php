<?php

namespace Tests\Feature\Api;

use App\Models\Client;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasInventoryModule;
use Tests\TestCase;

class ClientAddressTest extends TestCase
{
    use HasInventoryModule, RefreshDatabase;

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

    public function test_a_client_can_be_created_with_multiple_addresses(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);

        $response = $this->actingAs($owner, 'sanctum')->postJson('/api/clients', [
            'company_name' => 'PT Contoh',
            'pic_name' => 'Andi',
            'addresses' => [
                [
                    'label' => 'Kantor',
                    'province_id' => '32', 'province_name' => 'Jawa Barat',
                    'regency_id' => '3273', 'regency_name' => 'Kota Bandung',
                    'district_id' => '327301', 'district_name' => 'Sukasari',
                    'village_id' => '3273011001', 'village_name' => 'Isola',
                    'detail' => 'Jl. Contoh No. 1',
                ],
                ['label' => 'Gudang', 'detail' => 'Jl. Gudang No. 2'],
            ],
        ]);

        $response->assertCreated();
        $addresses = $response->json('data.addresses');
        $this->assertCount(2, $addresses);
        $this->assertSame('Kantor', $addresses[0]['label']);
        $this->assertSame('Jawa Barat', $addresses[0]['province_name']);
        $this->assertSame('Gudang', $addresses[1]['label']);
    }

    public function test_updating_a_clients_addresses_replaces_the_previous_set(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $client = Client::create(['tenant_id' => $tenant->id, 'company_name' => 'PT Contoh', 'pic_name' => 'Andi']);
        $client->addresses()->create(['label' => 'Lama', 'detail' => 'Alamat lama']);

        $response = $this->actingAs($owner, 'sanctum')->putJson("/api/clients/{$client->id}", [
            'addresses' => [['label' => 'Baru', 'detail' => 'Alamat baru']],
        ]);

        $response->assertOk();
        $addresses = $response->json('data.addresses');
        $this->assertCount(1, $addresses);
        $this->assertSame('Baru', $addresses[0]['label']);
        $this->assertSame(1, $client->addresses()->count());
    }

    public function test_omitting_addresses_on_update_leaves_existing_addresses_untouched(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);
        $client = Client::create(['tenant_id' => $tenant->id, 'company_name' => 'PT Contoh', 'pic_name' => 'Andi']);
        $client->addresses()->create(['label' => 'Kantor', 'detail' => 'Jl. Contoh']);

        $this->actingAs($owner, 'sanctum')
            ->putJson("/api/clients/{$client->id}", ['phone' => '08123456789'])
            ->assertOk();

        $this->assertSame(1, $client->addresses()->count());
    }

    public function test_an_addresses_label_is_required(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = $this->makeOwner($tenant);

        $this->actingAs($owner, 'sanctum')->postJson('/api/clients', [
            'company_name' => 'PT Contoh',
            'pic_name' => 'Andi',
            'addresses' => [['detail' => 'Tanpa label']],
        ])->assertStatus(422)->assertJsonValidationErrors('addresses.0.label');
    }

    public function test_deleting_a_client_deletes_its_addresses(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $client = Client::create(['tenant_id' => $tenant->id, 'company_name' => 'PT Contoh', 'pic_name' => 'Andi']);
        $address = $client->addresses()->create(['label' => 'Kantor', 'detail' => 'Jl. Contoh']);

        $client->delete();

        $this->assertDatabaseMissing('client_addresses', ['id' => $address->id]);
    }
}
