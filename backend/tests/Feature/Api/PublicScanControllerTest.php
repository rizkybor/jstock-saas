<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\ProductSeries;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasInventoryModule;
use Tests\TestCase;

class PublicScanControllerTest extends TestCase
{
    use HasInventoryModule, RefreshDatabase;

    private function makeProduct(Tenant $tenant, int $stock = 10): Product
    {
        return Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Gas Kalibrasi CH4 2.5%',
            'lot_batch' => 'LOT-TEST-0001',
            'unique_id' => 'BRG-PUBLICTEST',
            'unit_cost' => 145000,
            'grand_total_cost' => 145000 * $stock,
            'cogs' => 145000,
            'stock_qty' => $stock,
        ]);
    }

    public function test_a_product_can_be_looked_up_without_authentication(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $series = ProductSeries::create(['tenant_id' => $tenant->id, 'name' => 'CH4 — 2.5%', 'unit_cost' => 145000]);
        $product = $this->makeProduct($tenant);
        $product->update(['product_series_id' => $series->id]);

        $this->getJson("/api/public/{$tenant->token}/products/scan/{$product->unique_id}")
            ->assertOk()
            ->assertJsonPath('data.name', 'Gas Kalibrasi CH4 2.5%')
            ->assertJsonPath('data.unique_id', 'BRG-PUBLICTEST')
            ->assertJsonMissingPath('data.unit_cost')
            ->assertJsonMissingPath('data.grand_total_cost')
            ->assertJsonMissingPath('data.cogs')
            ->assertJsonMissingPath('data.series.unit_cost');
    }

    public function test_a_product_scan_includes_its_transaction_history_without_recipient_or_money_figures(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Owner',
            'email' => "owner-{$tenant->id}@test.local",
            'password' => 'password123',
            'role' => 'owner',
            'is_active' => true,
        ]);
        $product = $this->makeProduct($tenant, 40);

        $transactionId = $this->actingAs($owner, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'PT Rahasia Dagang',
            'no_invoice' => true,
            'address' => ['label' => 'Kantor'],
            'items' => [['product_id' => $product->id, 'qty' => 7]],
        ])->json('data.id');
        $trxNumber = Transaction::find($transactionId)->trx_number;

        $response = $this->getJson("/api/public/{$tenant->token}/products/scan/{$product->unique_id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.transactions')
            ->assertJsonPath('data.transactions.0.trx_number', $trxNumber)
            ->assertJsonPath('data.transactions.0.status', 'pending')
            ->assertJsonPath('data.transactions.0.qty', 7);

        // The recipient's identity and any money figure never leave the server.
        $entry = $response->json('data.transactions.0');
        $this->assertArrayNotHasKey('recipient', $entry);
        $this->assertArrayNotHasKey('client', $entry);
        $this->assertArrayNotHasKey('total', $entry);
        $this->assertArrayNotHasKey('subtotal', $entry);
        $this->assertStringNotContainsString('Rahasia Dagang', $response->getContent());
    }

    public function test_a_product_scan_reconstructs_stock_before_and_after_only_for_approved_transactions(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Owner',
            'email' => "owner-{$tenant->id}@test.local",
            'password' => 'password123',
            'role' => 'owner',
            'is_active' => true,
        ]);
        $product = $this->makeProduct($tenant, 40);

        // Approved: actually moves stock 40 -> 35.
        $approvedId = $this->actingAs($owner, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'no_invoice' => true,
            'address' => ['label' => 'Kantor'],
            'items' => [['product_id' => $product->id, 'qty' => 5]],
        ])->json('data.id');
        $this->actingAs($owner, 'sanctum')->patchJson("/api/transactions/{$approvedId}/approve")->assertOk();

        // Still pending: leaves stock untouched at 35.
        $this->actingAs($owner, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Budi',
            'no_invoice' => true,
            'address' => ['label' => 'Kantor'],
            'items' => [['product_id' => $product->id, 'qty' => 3]],
        ])->assertCreated();

        $this->getJson("/api/public/{$tenant->token}/products/scan/{$product->unique_id}")
            ->assertOk()
            ->assertJsonPath('data.stock_qty', 35)
            ->assertJsonCount(2, 'data.transactions')
            // Newest first: the still-pending one never touched stock.
            ->assertJsonPath('data.transactions.0.status', 'pending')
            ->assertJsonPath('data.transactions.0.stock_before', 35)
            ->assertJsonPath('data.transactions.0.stock_after', 35)
            // The approved one is what actually moved it from 40 down to 35.
            ->assertJsonPath('data.transactions.1.status', 'approved')
            ->assertJsonPath('data.transactions.1.stock_before', 40)
            ->assertJsonPath('data.transactions.1.stock_after', 35);
    }

    public function test_a_product_cannot_be_looked_up_through_another_tenants_token(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 'tenant-b', 'status' => 'trial']);
        $this->enableInventoryModule($tenantA);
        $this->enableInventoryModule($tenantB);
        $product = $this->makeProduct($tenantA);

        $this->getJson("/api/public/{$tenantB->token}/products/scan/{$product->unique_id}")
            ->assertStatus(404);
    }

    public function test_lookup_is_blocked_when_the_tenant_no_longer_has_the_module(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $product = $this->makeProduct($tenant); // module never granted

        $this->getJson("/api/public/{$tenant->token}/products/scan/{$product->unique_id}")
            ->assertStatus(403);
    }

    public function test_lookup_is_blocked_for_a_suspended_tenant(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'suspended']);
        $this->enableInventoryModule($tenant);
        $product = $this->makeProduct($tenant);

        $this->getJson("/api/public/{$tenant->token}/products/scan/{$product->unique_id}")
            ->assertStatus(403);
    }

    public function test_a_transaction_can_be_looked_up_without_authentication_and_flips_to_shipped(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Owner',
            'email' => "owner-{$tenant->id}@test.local",
            'password' => 'password123',
            'role' => 'owner',
            'is_active' => true,
        ]);
        $product = $this->makeProduct($tenant, 40);

        $transactionId = $this->actingAs($owner, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'no_invoice' => true,
            'address' => ['label' => 'Kantor'],
            'items' => [['product_id' => $product->id, 'qty' => 5]],
        ])->json('data.id');

        $this->actingAs($owner, 'sanctum')->patchJson("/api/transactions/{$transactionId}/approve")->assertOk();
        $trxNumber = Transaction::find($transactionId)->trx_number;

        $response = $this->getJson("/api/public/{$tenant->token}/transactions/scan/{$trxNumber}")
            ->assertOk()
            ->assertJsonPath('data.trx_number', $trxNumber)
            ->assertJsonPath('data.shipping_status', 'shipped')
            ->assertJsonMissingPath('data.total');

        $this->assertArrayNotHasKey('subtotal', $response->json('data.items.0'));
    }
}
