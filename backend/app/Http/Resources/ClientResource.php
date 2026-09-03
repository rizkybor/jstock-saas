<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_name' => $this->company_name,
            'pic_name' => $this->pic_name,
            'pic_position' => $this->pic_position,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'addresses' => ClientAddressResource::collection($this->whenLoaded('addresses')),
            'addresses_count' => $this->whenCounted('addresses'),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at,
        ];
    }
}
