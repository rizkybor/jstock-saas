<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price' => $this->price !== null ? (float) $this->price : null,
            'max_users' => $this->max_users,
            'max_transactions_per_month' => $this->max_transactions_per_month,
            'features' => $this->features ?? [],
        ];
    }
}
