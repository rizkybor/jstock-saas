<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantRequest extends FormRequest
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
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'province_id' => ['nullable', 'string', 'max:10'],
            'province_name' => ['nullable', 'string', 'max:255'],
            'regency_id' => ['nullable', 'string', 'max:10'],
            'regency_name' => ['nullable', 'string', 'max:255'],
            'district_id' => ['nullable', 'string', 'max:10'],
            'district_name' => ['nullable', 'string', 'max:255'],
            'village_id' => ['nullable', 'string', 'max:10'],
            'village_name' => ['nullable', 'string', 'max:255'],

            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'owner_password' => ['required', 'string', 'min:8'],

            'module_ids' => ['nullable', 'array'],
            'module_ids.*' => ['integer', Rule::exists('modules', 'id')],
        ];
    }
}
