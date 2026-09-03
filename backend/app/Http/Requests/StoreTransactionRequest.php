<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionRequest extends FormRequest
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
            'client_id' => ['nullable', Rule::exists('clients', 'id')->where('tenant_id', tenant_id())],
            'address_id' => ['nullable', 'integer', Rule::exists('client_addresses', 'id')->where('client_id', $this->input('client_id'))],
            'address' => ['nullable', 'array'],
            'address.label' => ['required_with:address', 'string', 'max:100'],
            'address.province_id' => ['nullable', 'string', 'max:10'],
            'address.province_name' => ['nullable', 'string', 'max:255'],
            'address.regency_id' => ['nullable', 'string', 'max:10'],
            'address.regency_name' => ['nullable', 'string', 'max:255'],
            'address.district_id' => ['nullable', 'string', 'max:10'],
            'address.district_name' => ['nullable', 'string', 'max:255'],
            'address.village_id' => ['nullable', 'string', 'max:10'],
            'address.village_name' => ['nullable', 'string', 'max:255'],
            'address.detail' => ['nullable', 'string', 'max:500'],

            'sender_id' => ['nullable', 'required_without_all:sender_name,sender_user_id', Rule::exists('senders', 'id')->where('tenant_id', tenant_id())],
            'sender_name' => ['nullable', 'required_without_all:sender_id,sender_user_id', 'string', 'max:255'],
            'sender_user_id' => ['nullable', 'required_without_all:sender_id,sender_name', Rule::exists('users', 'id')->where('tenant_id', tenant_id())],

            'recipient_id' => ['nullable', 'required_without_all:recipient_name,client_id', Rule::exists('recipients', 'id')->where('tenant_id', tenant_id())],
            'recipient_name' => ['nullable', 'required_without_all:recipient_id,client_id', 'string', 'max:255'],
            'recipient_position' => ['nullable', 'string', 'max:255'],
            'recipient_company' => ['nullable', 'string', 'max:255'],

            'no_invoice' => ['boolean'],
            'invoice_number' => [
                'nullable', 'string', 'max:100',
                Rule::requiredIf(fn () => ! $this->boolean('no_invoice')),
                Rule::unique('invoices', 'invoice_number')->where('tenant_id', tenant_id()),
            ],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', tenant_id())],
            'items.*.qty' => ['required', 'integer', 'min:1'],
        ];
    }
}
