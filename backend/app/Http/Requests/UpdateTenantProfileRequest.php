<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTenantProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Same editable fields as Admin\UpdateTenantRequest — deliberately
     * excludes slug/status/trial dates, which stay Super Admin-only.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
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
        ];
    }
}
