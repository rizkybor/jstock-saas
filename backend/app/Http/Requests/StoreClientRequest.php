<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
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
            'company_name' => ['required', 'string', 'max:255'],
            'pic_name' => ['required', 'string', 'max:255'],
            'pic_position' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],

            'addresses' => ['nullable', 'array'],
            'addresses.*.label' => ['required', 'string', 'max:100'],
            'addresses.*.province_id' => ['nullable', 'string', 'max:10'],
            'addresses.*.province_name' => ['nullable', 'string', 'max:255'],
            'addresses.*.regency_id' => ['nullable', 'string', 'max:10'],
            'addresses.*.regency_name' => ['nullable', 'string', 'max:255'],
            'addresses.*.district_id' => ['nullable', 'string', 'max:10'],
            'addresses.*.district_name' => ['nullable', 'string', 'max:255'],
            'addresses.*.village_id' => ['nullable', 'string', 'max:10'],
            'addresses.*.village_name' => ['nullable', 'string', 'max:255'],
            'addresses.*.detail' => ['nullable', 'string', 'max:500'],
        ];
    }
}
