<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionFlowTest extends TestCase
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

    private function makeProduct(Tenant $tenant, int $stock = 40): Product
    {
        return Product::create([
            'tenant_id' => $tenant->id,
            'name' => '8AL 25PPM H2S/100PPM CO',
            'lot_batch' => 'LOT-TEST-0001',
            'unit_cost' => 145000,
            'grand_total_cost' => 145000 * $stock,
            'cogs' => 145000,
            'stock_qty' => $stock,
        ]);
    }

    public function test_operator_can_submit_transaction_and_owner_can_approve_it(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');
        $operator = $this->makeUser($tenant, 'operator');
        $product = $this->makeProduct($tenant, 40);

        $response = $this->actingAs($operator, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'recipient_company' => 'PT Klien Satu',
            'items' => [['product_id' => $product->id, 'qty' => 5]],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.total', 725000);

        $transactionId = $response->json('data.id');

        // Operator has no approve permission.
        $this->actingAs($operator, 'sanctum')
            ->patchJson("/api/transactions/{$transactionId}/approve")
            ->assertStatus(403);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/transactions/{$transactionId}/approve")
            ->assertOk()
            ->assertJsonPath('data.transaction.status', 'approved')
            ->assertJsonPath('data.invoice.invoice_number', fn ($value) => str_starts_with($value, 'INV-'));

        $this->assertSame(35, $product->fresh()->stock_qty);

        // Cannot approve an already-approved transaction.
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/transactions/{$transactionId}/approve")
            ->assertStatus(422);
    }

    public function test_transaction_is_rejected_when_stock_is_insufficient(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');
        $product = $this->makeProduct($tenant, 3);

        $this->actingAs($owner, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'items' => [['product_id' => $product->id, 'qty' => 10]],
        ])->assertStatus(422);

        $this->assertSame(3, $product->fresh()->stock_qty);
    }

    public function test_rejecting_a_transaction_does_not_touch_stock(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');
        $product = $this->makeProduct($tenant, 10);

        $transactionId = $this->actingAs($owner, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'items' => [['product_id' => $product->id, 'qty' => 2]],
        ])->json('data.id');

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/transactions/{$transactionId}/reject", ['rejection_note' => 'Salah spesifikasi'])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected');

        $this->assertSame(10, $product->fresh()->stock_qty);
    }

    public function test_a_tenants_transaction_is_not_visible_to_another_tenant(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);
        $ownerA = $this->makeUser($tenantA, 'owner');
        $ownerB = $this->makeUser($tenantB, 'owner');
        $product = $this->makeProduct($tenantA, 10);

        $transactionId = $this->actingAs($ownerA, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'items' => [['product_id' => $product->id, 'qty' => 1]],
        ])->json('data.id');

        $this->actingAs($ownerB, 'sanctum')
            ->getJson("/api/transactions/{$transactionId}")
            ->assertStatus(404);

        $this->actingAs($ownerB, 'sanctum')
            ->patchJson("/api/transactions/{$transactionId}/approve")
            ->assertStatus(404);
    }
}
