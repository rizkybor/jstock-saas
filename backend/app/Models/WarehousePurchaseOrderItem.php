<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Line item of a WarehousePurchaseOrder — scoped through its PO, not its own tenant_id. */
#[Fillable(['warehouse_purchase_order_id', 'warehouse_item_id', 'qty_ordered', 'qty_received', 'unit_cost'])]
class WarehousePurchaseOrderItem extends Model
{
    protected function casts(): array
    {
        return [
            'unit_cost' => 'decimal:2',
        ];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(WarehousePurchaseOrder::class, 'warehouse_purchase_order_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(WarehouseItem::class, 'warehouse_item_id');
    }
}
