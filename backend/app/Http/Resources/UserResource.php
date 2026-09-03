<?php

namespace App\Http\Resources;

use App\Models\Module;
use App\Models\TenantMenuSetting;
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
            'tenant_name' => $this->tenant?->name,
            'permissions' => $this->permissions(),
            // Module keys this tenant actually has, and the effective
            // enabled/disabled state of every menu across those modules —
            // AppLayout uses both to decide which nav links to render.
            // Flattened across modules: fine while there's only one, but a
            // future second module reusing a menu_key would need this
            // reshaped to stay keyed by module.
            'modules' => $this->tenant_id ? $this->tenant->modules()->pluck('key') : [],
            'menus' => $this->tenant_id ? $this->effectiveMenus() : [],
        ];
    }

    /**
     * @return array<string, bool>
     */
    private function effectiveMenus(): array
    {
        $moduleKeys = $this->tenant->modules()->pluck('key');

        return $moduleKeys->reduce(
            fn ($menus, $moduleKey) => array_key_exists($moduleKey, Module::MENU_CATALOG)
                ? [...$menus, ...TenantMenuSetting::effectiveMenusFor($this->tenant_id, $moduleKey)]
                : $menus,
            [],
        );
    }
}
