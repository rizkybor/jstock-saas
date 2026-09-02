<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Database\Factories\ProductSeriesFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'name', 'description'])]
class ProductSeries extends Model
{
    /** @use HasFactory<ProductSeriesFactory> */
    use BelongsToTenant, HasFactory;

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
