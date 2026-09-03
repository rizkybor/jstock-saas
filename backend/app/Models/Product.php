<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'tenant_id', 'product_series_id', 'name', 'lot_batch', 'unique_id', 'item_detail',
    'unit_cost', 'additional_cost', 'grand_total_cost', 'cogs', 'stock_qty', 'input_date',
])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use BelongsToTenant, HasFactory;

    protected function casts(): array
    {
        return [
            'unit_cost' => 'decimal:2',
            'additional_cost' => 'decimal:2',
            'grand_total_cost' => 'decimal:2',
            'cogs' => 'decimal:2',
            'input_date' => 'date',
        ];
    }

    public function series(): BelongsTo
    {
        return $this->belongsTo(ProductSeries::class, 'product_series_id');
    }
}
