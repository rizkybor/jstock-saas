<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'sku', 'name', 'category', 'unit', 'price_buy', 'price_sell', 'min_stock', 'notes'])]
class WarehouseItem extends Model
{
    use BelongsToTenant;

    protected function casts(): array
    {
        return [
            'price_buy' => 'decimal:2',
            'price_sell' => 'decimal:2',
        ];
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
