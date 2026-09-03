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
            // Encrypted token, never the raw auto-increment id — see
            // App\Support\TenantToken.
            'token' => $this->token,
            'name' => $this->name,
            'slug' => $this->slug,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'status' => $this->status,
            'trial_ends_at' => $this->trial_ends_at,
            'users_count' => $this->whenCounted('users'),
            'plan' => $this->whenLoaded('activeSubscription', fn () => $this->activeSubscription?->plan?->name),
            'modules' => ModuleResource::collection($this->whenLoaded('modules')),
            'created_at' => $this->created_at,
        ];
    }
}
