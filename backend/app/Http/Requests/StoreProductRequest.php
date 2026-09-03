<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
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
            'product_series_id' => [
                'nullable',
                Rule::exists('product_series', 'id')->where('tenant_id', tenant_id()),
            ],
            'lot_batch' => ['nullable', 'string', 'max:100'],
            'unique_id' => ['nullable', 'string', 'max:100'],
            'item_detail' => ['nullable', 'string', 'max:1000'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'quantity' => ['required', 'integer', 'min:1'],
            'additional_cost' => ['nullable', 'numeric', 'min:0'],
            'input_date' => ['nullable', 'date'],
        ];
    }
}
