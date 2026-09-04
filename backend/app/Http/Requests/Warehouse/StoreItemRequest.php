<?php

namespace App\Http\Requests\Warehouse;

use App\Models\TenantBarcodeSetting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * warehouse_items.unit is NOT NULL with a "pcs" column default — that
     * default only applies when the column is omitted from the INSERT
     * entirely, not when an explicit null/empty string is sent (which
     * ConvertEmptyStringsToNull turns a blank form field into), so an
     * empty Satuan field would otherwise 500 on a DB constraint instead of
     * silently falling back to "pcs".
     */
    protected function prepareForValidation(): void
    {
        if (blank($this->unit)) {
            $this->merge(['unit' => 'pcs']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('warehouse_items', 'sku')->where('tenant_id', tenant_id())],
            'unique_id' => ['nullable', 'string', 'max:100'],
            'barcode_type' => ['nullable', Rule::in(TenantBarcodeSetting::effectiveSettingsFor(tenant_id())['warehouse-item']['allowed_types'])],
            'warehouse_category_id' => ['nullable', Rule::exists('warehouse_categories', 'id')->where('tenant_id', tenant_id())],
            'unit' => ['required', 'string', 'max:20'],
            'price_buy' => ['nullable', 'numeric', 'min:0'],
            'price_sell' => ['nullable', 'numeric', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_inventory_grant' => ['sometimes', 'boolean'],
            'inventory_grant_source' => ['nullable', 'string', 'max:255', 'required_if:is_inventory_grant,true'],
        ];
    }
}
