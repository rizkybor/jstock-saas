<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['tenant_id', 'name', 'contact_name', 'phone', 'email', 'address'])]
class WarehouseSupplier extends Model
{
    use BelongsToTenant;

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(WarehousePurchaseOrder::class);
    }
}
