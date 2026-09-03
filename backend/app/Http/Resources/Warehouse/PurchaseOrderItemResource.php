<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->warehouse_item_id,
            'item_name' => $this->whenLoaded('item', fn () => $this->item?->name),
            'item_sku' => $this->whenLoaded('item', fn () => $this->item?->sku),
            'qty_ordered' => $this->qty_ordered,
            'qty_received' => $this->qty_received,
            'unit_cost' => (float) $this->unit_cost,
        ];
    }
}
