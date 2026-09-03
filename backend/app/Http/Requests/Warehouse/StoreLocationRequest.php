<?php

namespace App\Http\Requests\Warehouse;

use App\Models\WarehouseLocation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLocationRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('warehouse_locations', 'code')->where('tenant_id', tenant_id())],
            'type' => ['nullable', Rule::in(WarehouseLocation::TYPES)],
            'parent_id' => ['nullable', Rule::exists('warehouse_locations', 'id')->where('tenant_id', tenant_id())],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
