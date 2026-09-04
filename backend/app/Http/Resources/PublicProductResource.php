<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicProductResource extends JsonResource
{
    /**
     * The unauthenticated "scan this QR code" view of a product — deliberately
     * omits unit_cost/additional_cost/grand_total_cost/cogs (see ProductResource
     * for the full, login-only version): those are internal cost figures that
     * shouldn't be exposed to whoever scans a label off a physical item.
     * Transaction history is included (trx_number/status/qty/date only) but
     * deliberately omits the recipient/client name and any money figure
     * (total, item subtotal) — showing who received this product would let
     * anyone scanning the label harvest a tenant's customer list.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->name,
            'lot_batch' => $this->lot_batch,
            'unique_id' => $this->unique_id,
            'barcode_type' => $this->barcode_type,
            'item_detail' => $this->item_detail,
            'series' => new PublicProductSeriesResource($this->whenLoaded('series')),
            'stock_qty' => $this->stock_qty,
            'input_date' => $this->input_date?->toDateString(),
            'transactions' => $this->when($this->relationLoaded('transactionItems'), fn () => $this->transactionHistory()),
        ];
    }

    /**
     * Unlike Warehouse's stock_movements ledger, a product has no separate
     * audit trail of every stock change — stock_qty only ever decrements
     * automatically when a transaction is approved (TransactionController::
     * finalizeApproval()); pending/rejected/cancelled transactions never
     * touch it. So stock_before/stock_after here is reconstructed by
     * walking the (newest-first) loaded transactions backwards from the
     * current stock_qty, subtracting qty only for approved ones. This is
     * only an approximation if stock_qty was ever hand-edited directly
     * (e.g. via the product edit form) outside the transaction flow, since
     * that kind of change leaves no record to walk back through.
     *
     * @return array<int, array<string, mixed>>
     */
    private function transactionHistory(): array
    {
        $running = (int) $this->stock_qty;

        return $this->transactionItems->map(function ($item) use (&$running) {
            $isApproved = $item->transaction->status === 'approved';

            $after = $running;
            $before = $isApproved ? $running + $item->qty : $running;
            $running = $before;

            return [
                'id' => $item->transaction->id,
                'trx_number' => $item->transaction->trx_number,
                'status' => $item->transaction->status,
                'qty' => $item->qty,
                'stock_before' => $before,
                'stock_after' => $after,
                'created_at' => $item->transaction->created_at,
            ];
        })->values()->all();
    }
}
