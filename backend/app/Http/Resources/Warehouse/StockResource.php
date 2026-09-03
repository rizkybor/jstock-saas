<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'qty' => $this->qty,
            'item' => $this->whenLoaded('item', fn () => $this->item?->only(['id', 'sku', 'name', 'unit'])),
            'location' => $this->whenLoaded('location', fn () => $this->location?->only(['id', 'name', 'code'])),
            'updated_at' => $this->updated_at,
        ];
    }
}
