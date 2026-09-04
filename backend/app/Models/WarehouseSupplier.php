<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'tenant_id', 'name', 'contact_name', 'phone', 'email', 'address',
    'province_id', 'province_name', 'regency_id', 'regency_name',
    'district_id', 'district_name', 'village_id', 'village_name',
])]
class WarehouseSupplier extends Model
{
    use BelongsToTenant;

    public function purchaseOrders(): HasMany
    {
        return $this->hasMany(WarehousePurchaseOrder::class);
    }
}
