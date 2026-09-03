<?php

namespace App\Http\Requests\Warehouse;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'warehouse_supplier_id' => ['required', Rule::exists('warehouse_suppliers', 'id')->where('tenant_id', tenant_id())],
            'receiving_location_id' => ['nullable', Rule::exists('warehouse_locations', 'id')->where('tenant_id', tenant_id())],
            'ordered_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.warehouse_item_id' => ['required', Rule::exists('warehouse_items', 'id')->where('tenant_id', tenant_id())],
            'items.*.qty_ordered' => ['required', 'integer', 'min:1'],
            'items.*.unit_cost' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
