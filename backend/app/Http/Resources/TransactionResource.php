<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'trx_number' => $this->trx_number,
            'status' => $this->status,
            'total' => (float) $this->total,
            'client' => $this->whenLoaded('client', fn () => $this->client?->only(['id', 'company_name', 'pic_name'])),
            'sender' => $this->whenLoaded('sender', fn () => $this->sender?->only(['id', 'name'])),
            'recipient' => $this->whenLoaded('recipient', fn () => $this->recipient?->only(['id', 'name', 'position', 'company'])),
            'items' => TransactionItemResource::collection($this->whenLoaded('items')),
            'invoice' => new InvoiceResource($this->whenLoaded('invoice')),
            'rejection_note' => $this->rejection_note,
            'approved_at' => $this->approved_at,
            'created_at' => $this->created_at,
        ];
    }
}
