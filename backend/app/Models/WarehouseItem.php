<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'sku', 'name', 'warehouse_category_id', 'unit', 'price_buy', 'price_sell', 'min_stock', 'notes',
    'is_inventory_grant', 'inventory_grant_source', 'unique_id', 'barcode_type',
])]
class WarehouseItem extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'price_buy' => 'decimal:2',
            'price_sell' => 'decimal:2',
            'is_inventory_grant' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(WarehouseCategory::class, 'warehouse_category_id');
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(WarehouseStock::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(WarehouseStockMovement::class);
    }

    /** Sum of this item's quantity across every location. */
    public function totalStock(): int
    {
        return (int) $this->stocks()->sum('qty');
    }
}
