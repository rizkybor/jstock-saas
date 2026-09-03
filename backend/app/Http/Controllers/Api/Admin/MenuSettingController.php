<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\Tenant;
use App\Models\TenantMenuSetting;
use Illuminate\Http\Request;

class MenuSettingController extends Controller
{
    /**
     * Every menu this module defines, mapped to whether this tenant
     * currently has it enabled — what the Super Admin's per-tenant menu
     * checklist (nested under a module in the "Modul" tab) renders.
     */
    public function index(Tenant $tenant, Module $module)
    {
        abort_unless(array_key_exists($module->key, Module::MENU_CATALOG), 404, 'Modul ini tidak memiliki menu yang bisa dikonfigurasi.');

        return response()->json([
            'success' => true,
            'data' => $this->menusPayload($tenant, $module),
            'message' => null,
        ]);
    }

    public function update(Request $request, Tenant $tenant, Module $module)
    {
        abort_unless(array_key_exists($module->key, Module::MENU_CATALOG), 404, 'Modul ini tidak memiliki menu yang bisa dikonfigurasi.');

        $menuKeys = array_keys(Module::MENU_CATALOG[$module->key]);

        $data = $request->validate([
            'menus' => ['required', 'array'],
            'menus.*' => ['boolean'],
        ]);

        foreach ($menuKeys as $key) {
            if (! array_key_exists($key, $data['menus'])) {
                continue;
            }

            TenantMenuSetting::updateOrCreate(
                ['tenant_id' => $tenant->id, 'module_key' => $module->key, 'menu_key' => $key],
                ['enabled' => $data['menus'][$key]],
            );
        }

        return response()->json([
            'success' => true,
            'data' => $this->menusPayload($tenant, $module),
            'message' => 'Akses menu berhasil disimpan.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function menusPayload(Tenant $tenant, Module $module): array
    {
        $effective = TenantMenuSetting::effectiveMenusFor($tenant->id, $module->key);

        return [
            'module_key' => $module->key,
            'menus' => collect(Module::MENU_CATALOG[$module->key])
                ->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'enabled' => $effective[$key]])
                ->values(),
        ];
    }
}
