<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicTransactionItemResource extends JsonResource
{
    /**
     * Deliberately omits `subtotal` — see PublicTransactionResource.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->whenLoaded('product', fn () => $this->product->name),
            'lot_batch' => $this->whenLoaded('product', fn () => $this->product->lot_batch),
            'qty' => $this->qty,
        ];
    }
}
