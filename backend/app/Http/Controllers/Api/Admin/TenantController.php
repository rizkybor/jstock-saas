<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTenantRequest;
use App\Http\Requests\Admin\UpdateTenantRequest;
use App\Http\Resources\ModuleResource;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\TenantResource;
use App\Models\Module;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    /**
     * Super Admin creates a tenant directly (no self-registration): the
     * company profile, its Owner account, a trial subscription — same as
     * self-registration — and optionally the module set to grant up front.
     */
    public function store(StoreTenantRequest $request)
    {
        $data = $request->validated();

        $tenant = DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'name' => $data['name'],
                'slug' => Tenant::generateUniqueSlug($data['name']),
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'address' => $data['address'] ?? null,
                'status' => 'trial',
                'trial_ends_at' => now()->addDays(14),
            ]);

            $trialPlan = Plan::firstOrCreate(
                ['slug' => 'trial'],
                ['name' => 'Trial', 'price' => 0, 'max_users' => 3, 'max_transactions_per_month' => 50]
            );

            Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $trialPlan->id,
                'status' => 'trialing',
                'started_at' => now(),
                'ends_at' => $tenant->trial_ends_at,
            ]);

            User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['owner_name'],
                'email' => $data['owner_email'],
                'password' => $data['owner_password'],
                'role' => 'owner',
                'is_active' => true,
            ]);

            if (! empty($data['module_ids'])) {
                $tenant->modules()->attach($data['module_ids']);
            }

            return $tenant;
        });

        $tenant->loadCount('users')->load(['activeSubscription.plan', 'modules']);

        return response()->json([
            'success' => true,
            'data' => new TenantResource($tenant),
            'message' => 'Tenant baru berhasil dibuat.',
        ], 201);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant)
    {
        $tenant->update($request->validated());
        $tenant->loadCount('users')->load(['activeSubscription.plan', 'modules']);

        return response()->json([
            'success' => true,
            'data' => new TenantResource($tenant),
            'message' => 'Profil tenant berhasil diperbarui.',
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

    /**
     * The tenant's current subscription (plan + status/dates) — what the
     * Configuration by Tenant ID "Plan" tab reads and lets Super Admin
     * change.
     */
    public function subscription(Tenant $tenant)
    {
        return response()->json([
            'success' => true,
            'data' => new SubscriptionResource($tenant->subscriptions()->latest()->with('plan')->first()),
            'message' => null,
        ]);
    }

    public function updateSubscription(Request $request, Tenant $tenant)
    {
        $data = $request->validate([
            'plan_id' => ['required', 'integer', 'exists:plans,id'],
            'status' => ['required', 'string', 'in:trialing,active,past_due,cancelled'],
            'ends_at' => ['nullable', 'date'],
        ]);

        $subscription = $tenant->subscriptions()->latest()->first();

        if ($subscription) {
            $subscription->update($data);
        } else {
            $subscription = Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $data['plan_id'],
                'status' => $data['status'],
                'started_at' => now(),
                'ends_at' => $data['ends_at'] ?? null,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => new SubscriptionResource($subscription->load('plan')),
            'message' => 'Plan tenant berhasil diperbarui.',
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
