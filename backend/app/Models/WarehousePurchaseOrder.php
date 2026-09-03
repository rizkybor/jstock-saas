<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'po_number', 'warehouse_supplier_id', 'receiving_location_id',
    'status', 'ordered_at', 'received_at', 'notes', 'created_by',
])]
class WarehousePurchaseOrder extends Model
{
    use BelongsToTenant;

    public const STATUSES = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'];

    protected function casts(): array
    {
        return [
            'ordered_at' => 'date',
            'received_at' => 'datetime',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(WarehouseSupplier::class, 'warehouse_supplier_id');
    }

    public function receivingLocation(): BelongsTo
    {
        return $this->belongsTo(WarehouseLocation::class, 'receiving_location_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(WarehousePurchaseOrderItem::class);
    }
}
