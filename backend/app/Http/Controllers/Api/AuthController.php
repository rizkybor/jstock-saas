<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Module;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Register a new tenant (company) and its Owner account.
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'name' => $data['company_name'],
                'slug' => $this->uniqueSlug($data['company_name']),
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

            // New tenants start with the flagship module enabled. Super Admin
            // can revoke it or grant additional modules afterwards from the
            // platform admin panel.
            $defaultModule = Module::where('key', 'inventory-gas-kalibrasi')->first();
            if ($defaultModule) {
                $tenant->modules()->attach($defaultModule->id);
            }

            return User::create([
                'tenant_id' => $tenant->id,
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => 'owner',
                'is_active' => true,
            ]);
        });

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
            'message' => 'Tenant berhasil didaftarkan.',
        ], 201);
    }

    /**
     * Authenticate a user and issue a personal access token.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        abort_unless($user->is_active, 403, 'Akun Anda tidak aktif.');
        abort_if($user->tenant?->status === 'suspended', 403, 'Akun perusahaan Anda sedang disuspend. Hubungi admin jstock.');

        $token = $user->createToken('auth')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
            'message' => 'Login berhasil.',
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Logout berhasil.',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => new UserResource($request->user()),
            'message' => null,
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 1;

        while (Tenant::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
