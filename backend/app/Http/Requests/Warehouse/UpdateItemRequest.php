<?php

namespace App\Http\Requests\Warehouse;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * See StoreItemRequest::prepareForValidation() — same NOT NULL/default
     * mismatch applies here. Only coerces when `unit` was actually part of
     * this request, so a partial update that doesn't touch it is untouched.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('unit') && blank($this->unit)) {
            $this->merge(['unit' => 'pcs']);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'sku' => [
                'nullable', 'string', 'max:100',
                Rule::unique('warehouse_items', 'sku')->where('tenant_id', tenant_id())->ignore($this->route('item')),
            ],
            'warehouse_category_id' => ['nullable', Rule::exists('warehouse_categories', 'id')->where('tenant_id', tenant_id())],
            'unit' => ['sometimes', 'required', 'string', 'max:20'],
            'price_buy' => ['nullable', 'numeric', 'min:0'],
            'price_sell' => ['nullable', 'numeric', 'min:0'],
            'min_stock' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'is_inventory_grant' => ['sometimes', 'boolean'],
            'inventory_grant_source' => ['nullable', 'string', 'max:255', 'required_if:is_inventory_grant,true'],
        ];
    }
}
