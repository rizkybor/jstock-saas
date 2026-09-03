<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantResource extends JsonResource
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
            'status' => $this->status,
            'trial_ends_at' => $this->trial_ends_at,
            'users_count' => $this->whenCounted('users'),
            'plan' => $this->whenLoaded('activeSubscription', fn () => $this->activeSubscription?->plan?->name),
            'modules' => ModuleResource::collection($this->whenLoaded('modules')),
            'created_at' => $this->created_at,
        ];
    }
}
