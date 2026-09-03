<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicProductResource;
use App\Http\Resources\PublicTransactionResource;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Support\Gtin14;

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
    private function assertTenantActive(Tenant $tenant): void
    {
        abort_if($tenant->status === 'suspended', 403, 'Akun perusahaan ini sedang disuspend.');
        abort_unless($tenant->hasModule('inventory-gas-kalibrasi'), 403, 'Modul ini tidak aktif untuk perusahaan ini.');
    }

    public function product(Tenant $tenant, string $uniqueId)
    {
        $this->assertTenantActive($tenant);

        $query = Product::withoutGlobalScopes()->where('tenant_id', $tenant->id);

        $product = ($id = Gtin14::decodeToId($uniqueId))
            ? $query->where('id', $id)->with('series')->firstOrFail()
            : $query->where('unique_id', $uniqueId)->with('series')->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new PublicProductResource($product),
            'message' => null,
        ]);
    }

    public function transaction(Tenant $tenant, string $trxNumber)
    {
        $this->assertTenantActive($tenant);

        $withRelations = ['sender', 'recipient', 'recipientAddress', 'items.product', 'invoice'];
        $query = Transaction::withoutGlobalScopes()->where('tenant_id', $tenant->id);

        $transaction = ($id = Gtin14::decodeToId($trxNumber))
            ? $query->where('id', $id)->with($withRelations)->firstOrFail()
            : $query->where('trx_number', $trxNumber)->with($withRelations)->firstOrFail();

        if ($transaction->status === 'approved' && $transaction->shipping_status === 'unshipped') {
            $transaction->update(['shipping_status' => 'shipped']);
        }

        return response()->json([
            'success' => true,
            'data' => new PublicTransactionResource($transaction),
            'message' => null,
        ]);
    }
}
