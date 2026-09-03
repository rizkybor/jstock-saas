<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ModuleResource;
use App\Http\Resources\TenantResource;
use App\Models\Module;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;

class TenantController extends Controller
{
    public function index(Request $request)
    {
        $tenants = Tenant::query()
            ->withCount('users')
            ->with(['activeSubscription.plan', 'modules'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->string('q')->isNotEmpty(), fn ($query) => $query->where('name', 'like', '%'.$request->string('q').'%'))
            ->latest()
            ->paginate($request->integer('limit', 10));

        return response()->json([
            'success' => true,
            'data' => TenantResource::collection($tenants->items()),
            'message' => null,
            'meta' => [
                'current_page' => $tenants->currentPage(),
                'last_page' => $tenants->lastPage(),
                'total' => $tenants->total(),
            ],
        ]);
    }

    public function show(Tenant $tenant)
    {
        $tenant->loadCount('users')->load(['activeSubscription.plan', 'modules']);

        return response()->json([
            'success' => true,
            'data' => new TenantResource($tenant),
            'message' => null,
        ]);
    }

    public function suspend(Tenant $tenant)
    {
        $tenant->update(['status' => 'suspended']);

        return response()->json([
            'success' => true,
            'data' => new TenantResource($tenant),
            'message' => 'Tenant berhasil disuspend.',
        ]);
    }

    public function activate(Tenant $tenant)
    {
        $tenant->update(['status' => 'active']);

        return response()->json([
            'success' => true,
            'data' => new TenantResource($tenant),
            'message' => 'Tenant berhasil diaktifkan kembali.',
        ]);
    }

    /**
     * Full module catalog with an `enabled` flag for this specific tenant —
     * what the Super Admin's module-assignment panel renders as checkboxes.
     */
    public function modules(Tenant $tenant)
    {
        $enabledIds = $tenant->modules()->pluck('modules.id');

        $modules = Module::orderBy('name')->get()->map(fn (Module $module) => [
            ...(new ModuleResource($module))->resolve(),
            'enabled' => $enabledIds->contains($module->id),
        ]);

        return response()->json([
            'success' => true,
            'data' => $modules,
            'message' => null,
        ]);
    }

    public function attachModule(Tenant $tenant, Module $module)
    {
        $tenant->modules()->syncWithoutDetaching([$module->id]);

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => "Modul \"{$module->name}\" diaktifkan untuk {$tenant->name}.",
        ]);
    }

    public function detachModule(Tenant $tenant, Module $module)
    {
        $tenant->modules()->detach($module->id);

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => "Modul \"{$module->name}\" dinonaktifkan untuk {$tenant->name}.",
        ]);
    }

    public function stats()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'total_tenants' => Tenant::count(),
                'active_tenants' => Tenant::where('status', 'active')->count(),
                'trial_tenants' => Tenant::where('status', 'trial')->count(),
                'suspended_tenants' => Tenant::where('status', 'suspended')->count(),
                'total_users' => User::withoutGlobalScopes()->whereNotNull('tenant_id')->count(),
                'total_transactions' => Transaction::withoutGlobalScopes()->count(),
            ],
            'message' => null,
        ]);
    }
}
