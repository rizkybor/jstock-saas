<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sku' => $this->sku,
            'barcode_type' => $this->barcode_type,
            'name' => $this->name,
            'warehouse_category_id' => $this->warehouse_category_id,
            'category_name' => $this->whenLoaded('category', fn () => $this->category?->name),
            'unit' => $this->unit,
            'price_buy' => $this->price_buy !== null ? (float) $this->price_buy : null,
            'price_sell' => $this->price_sell !== null ? (float) $this->price_sell : null,
            'min_stock' => $this->min_stock,
            'notes' => $this->notes,
            'is_inventory_grant' => $this->is_inventory_grant,
            'inventory_grant_source' => $this->inventory_grant_source,
            'total_stock' => $this->when($this->relationLoaded('stocks'), fn () => (int) $this->stocks->sum('qty')),
            'created_at' => $this->created_at,
        ];
    }
}
