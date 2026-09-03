<?php

namespace Tests\Feature\Api\Admin;

use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\HasInventoryModule;
use Tests\TestCase;

class ApprovalSettingsTest extends TestCase
{
    use HasInventoryModule, RefreshDatabase;

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

    public function test_super_admin_can_define_a_multi_step_approval_flow(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->makeUser($tenant, 'operator');
        $this->makeUser($tenant, 'manager');
        $this->makeUser($tenant, 'owner');

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/approval-settings", [
                'requires_approval' => true,
                'steps' => [
                    ['role' => 'manager', 'label' => 'Persetujuan Manager'],
                    ['role' => 'owner', 'label' => 'Persetujuan Owner'],
                ],
            ])
            ->assertOk();

        $steps = collect($response->json('data.steps'));
        $this->assertSame(['manager', 'owner'], $steps->pluck('role')->all());
        $this->assertSame([1, 2], $steps->pluck('sequence')->all());
    }

    public function test_transaction_moves_through_each_step_in_order_before_it_is_approved(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $operator = $this->makeUser($tenant, 'operator');
        $manager = $this->makeUser($tenant, 'manager');
        $owner = $this->makeUser($tenant, 'owner');
        $product = $this->makeProduct($tenant, 40);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/tenants/{$tenant->token}/approval-settings", [
            'requires_approval' => true,
            'steps' => [
                ['role' => 'manager'],
                ['role' => 'owner'],
            ],
        ])->assertOk();

        $transactionId = $this->actingAs($operator, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'invoice_number' => 'INV-TEST-0001',
            'address' => ['label' => 'Kantor'],
            'items' => [['product_id' => $product->id, 'qty' => 5]],
        ])->assertJsonPath('data.pending_approval.role', 'manager')
            ->json('data.id');

        // Owner cannot jump ahead of the manager step.
        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/transactions/{$transactionId}/approve")
            ->assertStatus(403);

        $this->actingAs($manager, 'sanctum')
            ->patchJson("/api/transactions/{$transactionId}/approve")
            ->assertOk()
            ->assertJsonPath('data.transaction.status', 'pending')
            ->assertJsonPath('data.transaction.pending_approval.role', 'owner');

        // Stock is untouched until the chain fully completes.
        $this->assertSame(40, $product->fresh()->stock_qty);

        $this->actingAs($owner, 'sanctum')
            ->patchJson("/api/transactions/{$transactionId}/approve")
            ->assertOk()
            ->assertJsonPath('data.transaction.status', 'approved')
            ->assertJsonPath('data.invoice.invoice_number', fn ($value) => str_starts_with($value, 'INV-'));

        $this->assertSame(35, $product->fresh()->stock_qty);
    }

    public function test_disabling_approval_auto_approves_transactions_on_creation(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->enableInventoryModule($tenant);
        $operator = $this->makeUser($tenant, 'operator');
        $product = $this->makeProduct($tenant, 40);

        $this->actingAs($admin, 'sanctum')->putJson("/api/admin/tenants/{$tenant->token}/approval-settings", [
            'requires_approval' => false,
            'steps' => [],
        ])->assertOk();

        $this->actingAs($operator, 'sanctum')->postJson('/api/transactions', [
            'sender_name' => 'Pak Joko',
            'recipient_name' => 'Andi',
            'no_invoice' => true,
            'address' => ['label' => 'Kantor'],
            'items' => [['product_id' => $product->id, 'qty' => 5]],
        ])->assertCreated()
            ->assertJsonPath('data.status', 'approved');

        $this->assertSame(35, $product->fresh()->stock_qty);
    }

    public function test_update_validates_step_roles_and_returns_warnings_for_roles_missing_the_approve_permission(): void
    {
        $admin = $this->makeSuperAdmin();
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $this->makeUser($tenant, 'viewer');

        $response = $this->actingAs($admin, 'sanctum')
            ->putJson("/api/admin/tenants/{$tenant->token}/approval-settings", [
                'requires_approval' => true,
                'steps' => [['role' => 'viewer']],
            ])
            ->assertOk();

        $this->assertNotEmpty($response->json('warnings'));
    }

    public function test_only_super_admin_can_manage_approval_settings(): void
    {
        $tenant = Tenant::create(['name' => 'Tenant A', 'slug' => 'tenant-a', 'status' => 'trial']);
        $owner = $this->makeUser($tenant, 'owner');

        $this->actingAs($owner, 'sanctum')
            ->getJson("/api/admin/tenants/{$tenant->token}/approval-settings")
            ->assertStatus(403);
    }
}
