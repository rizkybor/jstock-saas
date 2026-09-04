<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicItemResource extends JsonResource
{
    /**
     * The unauthenticated "scan this QR code" view of a warehouse item —
     * deliberately omits price_buy/price_sell (see PublicProductResource
     * for the same reasoning applied to the Inventory Gas Kalibrasi module):
     * a scanned label should confirm identity, not leak internal pricing.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->name,
            'sku' => $this->sku,
            'unique_id' => $this->unique_id,
            'barcode_type' => $this->barcode_type,
            'category_name' => $this->whenLoaded('category', fn () => $this->category?->name),
            'unit' => $this->unit,
        ];
    }
}
