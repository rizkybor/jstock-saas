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
            'invoice_number' => $this->invoice_number,
            'no_invoice' => $this->no_invoice,
            'client' => $this->whenLoaded('client', fn () => $this->client?->only(['id', 'company_name', 'pic_name'])),
            'sender' => $this->whenLoaded('sender', fn () => $this->sender?->only(['id', 'name'])),
            'recipient' => $this->whenLoaded('recipient', fn () => $this->recipient?->only(['id', 'name', 'position', 'company'])),
            'recipient_address' => $this->recipient_address_id
                ? $this->whenLoaded('recipientAddress', fn () => $this->recipientAddress ? new ClientAddressResource($this->recipientAddress) : null)
                : $this->recipient_address_snapshot,
            'items' => TransactionItemResource::collection($this->whenLoaded('items')),
            'invoice' => new InvoiceResource($this->whenLoaded('invoice')),
            'pending_approval' => $this->whenLoaded(
                'currentApprovalStep',
                fn () => $this->currentApprovalStep
                    ? ['role' => $this->currentApprovalStep->role, 'label' => $this->currentApprovalStep->label, 'sequence' => $this->currentApprovalStep->sequence]
                    : null,
            ),
            'approvals' => $this->whenLoaded('approvals', fn () => $this->approvals->map(fn ($approval) => [
                'decision' => $approval->decision,
                'note' => $approval->note,
                'approver_name' => $approval->approver?->name,
                'role' => $approval->approvalStep?->role,
                'created_at' => $approval->created_at,
            ])),
            'rejection_note' => $this->rejection_note,
            'approved_at' => $this->approved_at,
            'created_at' => $this->created_at,
        ];
    }
}
