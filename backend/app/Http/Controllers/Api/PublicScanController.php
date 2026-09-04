<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicProductResource;
use App\Http\Resources\PublicTransactionResource;
use App\Http\Resources\Warehouse\PublicItemResource;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\WarehouseItem;

/**
 * Unauthenticated landing endpoints for a scanned product/transaction QR
 * code or barcode label — a courier or warehouse floor worker scanning a
 * physical label has no jstock account, so these can't sit behind
 * auth:sanctum like every other route. Security instead comes from:
 *  - every query is scoped to the {tenant} resolved from the URL itself
 *    (via withoutGlobalScopes()->where('tenant_id', ...), since there's no
 *    authenticated user for BelongsToTenant's global scope to key off of),
 *    so a unique_id/trx_number can never resolve into a different tenant's
 *    record even if guessed;
 *  - the response uses Public*Resource, which omits cost/price figures
 *    (unit_cost, cogs, transaction total, item subtotal) that the full,
 *    login-only resources expose — a scanned label should confirm identity,
 *    not leak internal pricing to whoever holds it;
 *  - the tenant must still have the module active and not be suspended.
 */
class PublicScanController extends Controller
{
    private function assertTenantActive(Tenant $tenant, string $moduleKey): void
    {
        abort_if($tenant->status === 'suspended', 403, 'Akun perusahaan ini sedang disuspend.');
        abort_unless($tenant->hasModule($moduleKey), 403, 'Modul ini tidak aktif untuk perusahaan ini.');
    }

    public function product(Tenant $tenant, string $uniqueId)
    {
        $this->assertTenantActive($tenant, 'inventory-gas-kalibrasi');

        $product = Product::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('unique_id', $uniqueId)
            ->with('series')
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new PublicProductResource($product),
            'message' => null,
        ]);
    }

    public function transaction(Tenant $tenant, string $trxNumber)
    {
        $this->assertTenantActive($tenant, 'inventory-gas-kalibrasi');

        $transaction = Transaction::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('trx_number', $trxNumber)
            ->with(['sender', 'recipient', 'recipientAddress', 'items.product', 'invoice'])
            ->firstOrFail();

        if ($transaction->status === 'approved' && $transaction->shipping_status === 'unshipped') {
            $transaction->update(['shipping_status' => 'shipped']);
        }

        return response()->json([
            'success' => true,
            'data' => new PublicTransactionResource($transaction),
            'message' => null,
        ]);
    }

    public function warehouseItem(Tenant $tenant, string $sku)
    {
        $this->assertTenantActive($tenant, 'warehouse-general');

        $item = WarehouseItem::withoutGlobalScopes()
            ->where('tenant_id', $tenant->id)
            ->where('sku', $sku)
            ->with('category')
            ->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new PublicItemResource($item),
            'message' => null,
        ]);
    }
}
