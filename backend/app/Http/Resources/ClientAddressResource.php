<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClientAddressResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'province_id' => $this->province_id,
            'province_name' => $this->province_name,
            'regency_id' => $this->regency_id,
            'regency_name' => $this->regency_name,
            'district_id' => $this->district_id,
            'district_name' => $this->district_name,
            'village_id' => $this->village_id,
            'village_name' => $this->village_name,
            'detail' => $this->detail,
        ];
    }
}
