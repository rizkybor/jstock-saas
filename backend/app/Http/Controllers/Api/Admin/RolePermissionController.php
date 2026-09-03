<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\Tenant;
use App\Models\TenantRolePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

class RolePermissionController extends Controller
{
    /**
     * Every permission string the platform knows about (the 4 preset role
     * matrices in config/permissions.php cover the full set), grouped by
     * module (the part before the first dot), then narrowed down to the
     * groups relevant for this tenant: a group belonging to a module
     * (Module::PERMISSION_GROUPS) is only kept if the tenant actually has
     * that module; a group that isn't module-specific (tenant, users,
     * billing) is core/platform-level and always shown.
     */
    public function catalog(Tenant $tenant)
    {
        $tenantModuleKeys = $tenant->modules()->pluck('key');

        $all = collect(config('permissions'))
            ->except('super_admin')
            ->flatten()
            ->unique()
            ->sort()
            ->values();

        $grouped = $all->groupBy(fn ($permission) => explode('.', $permission)[0]);

        $relevant = $grouped->filter(fn ($permissions, $module) => $this->groupAppliesToTenant($module, $tenantModuleKeys));

        return response()->json([
            'success' => true,
            'data' => $relevant->map(fn ($permissions, $module) => [
                'module' => $module,
                'permissions' => $permissions->values(),
            ])->values(),
            'message' => null,
        ]);
    }

    /**
     * A permission group is relevant to a tenant if it isn't tied to any
     * module at all (core/platform-level), or if it's tied to one of the
     * modules the tenant currently has.
     */
    private function groupAppliesToTenant(string $group, Collection $tenantModuleKeys): bool
    {
        $owningModule = collect(Module::PERMISSION_GROUPS)->search(fn ($groups) => in_array($group, $groups, true));

        return $owningModule === false || $tenantModuleKeys->contains($owningModule);
    }

    /**
     * Effective permission set per role actually in use by this tenant's
     * accounts — every tenant is free to only use "Owner", or add its own
     * job titles, so the role list is derived from its users, not a fixed
     * platform-wide set. Custom override wins if Super Admin has set one,
     * otherwise the platform default for that role name (empty for a role
     * name the platform doesn't preset).
     */
    public function index(Tenant $tenant)
    {
        $activeRoles = User::where('tenant_id', $tenant->id)
            ->whereNotNull('role')
            ->distinct()
            ->orderBy('role')
            ->pluck('role');

        $roles = $activeRoles->map(function ($role) use ($tenant) {
            $custom = TenantRolePermission::where('tenant_id', $tenant->id)
                ->where('role', $role)
                ->pluck('permission');

            return [
                'role' => $role,
                'is_custom' => $custom->isNotEmpty(),
                'permissions' => $custom->isNotEmpty() ? $custom->values() : collect(config("permissions.{$role}", []))->values(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $roles->values(),
            'message' => null,
        ]);
    }

    private function assertActiveRole(Tenant $tenant, string $role): void
    {
        abort_unless(
            User::where('tenant_id', $tenant->id)->where('role', $role)->exists(),
            404,
            "Role \"{$role}\" tidak digunakan oleh akun manapun di tenant ini."
        );
    }

    public function update(Request $request, Tenant $tenant, string $role)
    {
        $this->assertActiveRole($tenant, $role);

        $tenantModuleKeys = $tenant->modules()->pluck('key');
        $validCatalog = collect(config('permissions'))
            ->except('super_admin')
            ->flatten()
            ->unique()
            ->filter(fn ($permission) => $this->groupAppliesToTenant(explode('.', $permission)[0], $tenantModuleKeys))
            ->values()
            ->all();

        $data = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => [Rule::in($validCatalog)],
        ]);

        TenantRolePermission::where('tenant_id', $tenant->id)->where('role', $role)->delete();

        $rows = collect($data['permissions'])->map(fn ($permission) => [
            'tenant_id' => $tenant->id,
            'role' => $role,
            'permission' => $permission,
            'created_at' => now(),
            'updated_at' => now(),
        ])->all();

        if ($rows) {
            TenantRolePermission::insert($rows);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'role' => $role,
                'permissions' => $data['permissions'],
            ],
            'message' => "Permission untuk role \"{$role}\" berhasil disimpan.",
        ]);
    }

    public function reset(Tenant $tenant, string $role)
    {
        $this->assertActiveRole($tenant, $role);

        TenantRolePermission::where('tenant_id', $tenant->id)->where('role', $role)->delete();

        return response()->json([
            'success' => true,
            'data' => [
                'role' => $role,
                'permissions' => config("permissions.{$role}", []),
            ],
            'message' => "Role \"{$role}\" dikembalikan ke default platform.",
        ]);
    }
}
