<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockOpnameResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'system_qty' => $this->system_qty,
            'physical_qty' => $this->physical_qty,
            'difference' => $this->difference,
            'note' => $this->note,
            'item' => $this->whenLoaded('item', fn () => $this->item?->only(['id', 'sku', 'name'])),
            'location' => $this->whenLoaded('location', fn () => $this->location?->only(['id', 'name'])),
            'created_by_name' => $this->whenLoaded('creator', fn () => $this->creator?->name),
            'created_at' => $this->created_at,
        ];
    }
}
