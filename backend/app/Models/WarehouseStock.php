<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Current quantity of one item at one location — see the migration for why
 * this (and not warehouse_items) is the source of truth for "how much".
 */
#[Fillable(['tenant_id', 'warehouse_item_id', 'warehouse_location_id', 'qty'])]
class WarehouseStock extends Model
{
    use BelongsToTenant;

    public function item(): BelongsTo
    {
        return $this->belongsTo(WarehouseItem::class, 'warehouse_item_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(WarehouseLocation::class, 'warehouse_location_id');
    }
}
