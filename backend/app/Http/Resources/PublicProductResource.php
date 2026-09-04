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
            'transactions' => $this->when($this->relationLoaded('transactionItems'), fn () => $this->transactionItems->map(fn ($item) => [
                'id' => $item->transaction->id,
                'trx_number' => $item->transaction->trx_number,
                'status' => $item->transaction->status,
                'qty' => $item->qty,
                'created_at' => $item->transaction->created_at,
            ])->values()),
        ];
    }
}
