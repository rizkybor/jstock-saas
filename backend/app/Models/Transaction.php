<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Database\Factories\TransactionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'tenant_id', 'trx_number', 'barcode_type', 'client_id', 'recipient_address_id', 'recipient_address_snapshot', 'sender_id', 'recipient_id',
    'status', 'shipping_status', 'current_approval_step_id', 'total', 'invoice_number', 'no_invoice',
    'approved_by', 'approved_at', 'rejection_note',
])]
class Transaction extends Model
{
    /** @use HasFactory<TransactionFactory> */
    use BelongsToTenant, HasFactory;

    /** Separate from the approval `status` — tracks physical delivery of an approved transaction. */
    public const SHIPPING_STATUSES = ['unshipped', 'shipped'];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'no_invoice' => 'boolean',
            'recipient_address_snapshot' => 'array',
            'approved_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(Sender::class);
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(Recipient::class);
    }

    public function recipientAddress(): BelongsTo
    {
        return $this->belongsTo(ClientAddress::class, 'recipient_address_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function currentApprovalStep(): BelongsTo
    {
        return $this->belongsTo(ApprovalStep::class, 'current_approval_step_id');
    }

    public function approvals(): HasMany
    {
        return $this->hasMany(TransactionApproval::class)->latest();
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }
}
