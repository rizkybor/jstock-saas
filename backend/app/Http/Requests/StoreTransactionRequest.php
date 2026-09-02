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

            'sender_id' => ['nullable', 'required_without:sender_name', Rule::exists('senders', 'id')->where('tenant_id', tenant_id())],
            'sender_name' => ['nullable', 'required_without:sender_id', 'string', 'max:255'],

            'recipient_id' => ['nullable', 'required_without:recipient_name', Rule::exists('recipients', 'id')->where('tenant_id', tenant_id())],
            'recipient_name' => ['nullable', 'required_without:recipient_id', 'string', 'max:255'],
            'recipient_position' => ['nullable', 'string', 'max:255'],
            'recipient_company' => ['nullable', 'string', 'max:255'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', tenant_id())],
            'items.*.qty' => ['required', 'integer', 'min:1'],
        ];
    }
}
