<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicTransactionResource extends JsonResource
{
    /**
     * The unauthenticated "scan this QR code" view of a transaction —
     * deliberately omits `total` (see TransactionResource for the full,
     * login-only version): the delivery-confirmation use case this page
     * serves only needs items/sender/recipient, not the money figure.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'trx_number' => $this->trx_number,
            'barcode_type' => $this->barcode_type,
            'status' => $this->status,
            'shipping_status' => $this->shipping_status,
            'invoice_number' => $this->invoice_number,
            'no_invoice' => $this->no_invoice,
            'sender' => $this->whenLoaded('sender', fn () => $this->sender?->only(['id', 'name'])),
            'recipient' => $this->whenLoaded('recipient', fn () => $this->recipient?->only(['id', 'name', 'position', 'company'])),
            'recipient_address' => $this->recipient_address_id
                ? $this->whenLoaded('recipientAddress', fn () => $this->recipientAddress ? new ClientAddressResource($this->recipientAddress) : null)
                : $this->recipient_address_snapshot,
            'items' => PublicTransactionItemResource::collection($this->whenLoaded('items')),
            'invoice' => new InvoiceResource($this->whenLoaded('invoice')),
            'rejection_note' => $this->rejection_note,
            'approved_at' => $this->approved_at,
        ];
    }
}
