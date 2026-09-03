<?php

namespace App\Http\Resources;

use App\Support\TenantToken;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => $this->is_active,
            // Encrypted, not the raw tenant id — the frontend uses this for
            // its /:tenantToken/... routes and never sees the real id.
            'tenant_token' => $this->tenant_id ? TenantToken::encode($this->tenant_id) : null,
            'permissions' => $this->permissions(),
        ];
    }
}
