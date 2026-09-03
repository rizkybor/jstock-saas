<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'po_number' => $this->po_number,
            'status' => $this->status,
            'supplier' => $this->whenLoaded('supplier', fn () => $this->supplier?->only(['id', 'name'])),
            'receiving_location' => $this->whenLoaded('receivingLocation', fn () => $this->receivingLocation?->only(['id', 'name'])),
            'ordered_at' => $this->ordered_at?->toDateString(),
            'received_at' => $this->received_at,
            'notes' => $this->notes,
            'items' => PurchaseOrderItemResource::collection($this->whenLoaded('items')),
            'created_at' => $this->created_at,
        ];
    }
}
