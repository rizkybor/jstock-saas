<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantRolePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RolePermissionController extends Controller
{
    /**
     * Every permission string the platform knows about (the 4 preset role
     * matrices in config/permissions.php cover the full set), grouped by
     * module (the part before the first dot) — what the checklist UI renders
     * regardless of which roles a given tenant actually uses.
     */
    public function catalog()
    {
        $all = collect(config('permissions'))
            ->except('super_admin')
            ->flatten()
            ->unique()
            ->sort()
            ->values();

        $grouped = $all->groupBy(fn ($permission) => explode('.', $permission)[0]);

        return response()->json([
            'success' => true,
            'data' => $grouped->map(fn ($permissions, $module) => [
                'module' => $module,
                'permissions' => $permissions->values(),
            ])->values(),
            'message' => null,
        ]);
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

        $validCatalog = collect(config('permissions'))->except('super_admin')->flatten()->unique()->values()->all();

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
