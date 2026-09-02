<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TenantResource;
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
            ->with('activeSubscription.plan')
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
        $tenant->loadCount('users')->load('activeSubscription.plan');

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
