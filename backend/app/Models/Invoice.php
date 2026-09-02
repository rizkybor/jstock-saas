<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'transaction_id', 'invoice_number', 'file_path', 'signed', 'stamped'])]
class Invoice extends Model
{
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'signed' => 'boolean',
            'stamped' => 'boolean',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
