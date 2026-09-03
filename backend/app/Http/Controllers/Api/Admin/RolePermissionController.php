<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantRolePermission;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RolePermissionController extends Controller
{
    /** Tenant-level roles a Super Admin can customize — super_admin itself never is. */
    private const ROLES = ['owner', 'manager', 'operator', 'viewer'];

    /**
     * Every permission string that exists on any tenant role, grouped by
     * module (the part before the first dot) — what the checklist UI renders.
     */
    public function catalog()
    {
        $all = collect(self::ROLES)
            ->flatMap(fn ($role) => config("permissions.{$role}", []))
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
     * Effective permission set per role for this tenant — custom override
     * if Super Admin has set one, otherwise the platform default.
     */
    public function index(Tenant $tenant)
    {
        $roles = collect(self::ROLES)->map(function ($role) use ($tenant) {
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
            'data' => $roles,
            'message' => null,
        ]);
    }

    public function update(Request $request, Tenant $tenant, string $role)
    {
        abort_unless(in_array($role, self::ROLES, true), 404);

        $validCatalog = collect(self::ROLES)->flatMap(fn ($r) => config("permissions.{$r}", []))->unique()->values()->all();

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
        abort_unless(in_array($role, self::ROLES, true), 404);

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
