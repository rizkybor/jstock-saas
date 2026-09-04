<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SupplierResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'contact_name' => $this->contact_name,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'province_id' => $this->province_id,
            'province_name' => $this->province_name,
            'regency_id' => $this->regency_id,
            'regency_name' => $this->regency_name,
            'district_id' => $this->district_id,
            'district_name' => $this->district_name,
            'village_id' => $this->village_id,
            'village_name' => $this->village_name,
            'created_at' => $this->created_at,
        ];
    }
}
