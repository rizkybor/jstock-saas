<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'lot_batch' => $this->lot_batch,
            'unique_id' => $this->unique_id,
            'item_detail' => $this->item_detail,
            'product_series_id' => $this->product_series_id,
            'series' => new ProductSeriesResource($this->whenLoaded('series')),
            'unit_cost' => (float) $this->unit_cost,
            'additional_cost' => (float) $this->additional_cost,
            'grand_total_cost' => (float) $this->grand_total_cost,
            'cogs' => (float) $this->cogs,
            'stock_qty' => $this->stock_qty,
            'input_date' => $this->input_date?->toDateString(),
            'created_at' => $this->created_at,
        ];
    }
}
