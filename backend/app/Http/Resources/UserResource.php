<?php

namespace App\Http\Resources;

use App\Models\Module;
use App\Models\TenantMenuSetting;
use App\Support\TenantToken;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

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
            // Sidebar branding falls back to the default jstock logo/name
            // when a tenant hasn't uploaded one (see Profil Perusahaan).
            'tenant_logo_url' => $this->tenant?->logo_path ? Storage::disk('public')->url($this->tenant->logo_path) : null,
            'permissions' => $this->permissions(),
            // Module keys this tenant actually has, and the effective
            // enabled/disabled state of every menu for each of those
            // modules — AppLayout uses both to decide which nav links to
            // render. Keyed by module key (not flattened) so two modules
            // can each have a menu of the same name without colliding.
            'modules' => $this->tenant_id ? $this->tenant->modules()->pluck('key') : [],
            'menus' => $this->tenant_id ? $this->effectiveMenus() : [],
        ];
    }

    /**
     * @return array<string, array<string, bool>>
     */
    private function effectiveMenus(): array
    {
        $moduleKeys = $this->tenant->modules()->pluck('key');

        return $moduleKeys->mapWithKeys(fn ($moduleKey) => array_key_exists($moduleKey, Module::MENU_CATALOG)
            ? [$moduleKey => TenantMenuSetting::effectiveMenusFor($this->tenant_id, $moduleKey)]
            : [])->all();
    }
}
