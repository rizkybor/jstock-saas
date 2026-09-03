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

            'sender_id' => ['nullable', 'required_without_all:sender_name,sender_user_id', Rule::exists('senders', 'id')->where('tenant_id', tenant_id())],
            'sender_name' => ['nullable', 'required_without_all:sender_id,sender_user_id', 'string', 'max:255'],
            'sender_user_id' => ['nullable', 'required_without_all:sender_id,sender_name', Rule::exists('users', 'id')->where('tenant_id', tenant_id())],

            'recipient_id' => ['nullable', 'required_without_all:recipient_name,client_id', Rule::exists('recipients', 'id')->where('tenant_id', tenant_id())],
            'recipient_name' => ['nullable', 'required_without_all:recipient_id,client_id', 'string', 'max:255'],
            'recipient_position' => ['nullable', 'string', 'max:255'],
            'recipient_company' => ['nullable', 'string', 'max:255'],

            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', Rule::exists('products', 'id')->where('tenant_id', tenant_id())],
            'items.*.qty' => ['required', 'integer', 'min:1'],
        ];
    }
}
