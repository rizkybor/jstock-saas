<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTenantUserRequest;
use App\Http\Requests\Admin\UpdateTenantUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /**
     * Accounts for this tenant only Super Admin can create/manage — the
     * role each account carries is what the Roles & Permission tab lists
     * for this tenant (no fixed platform-wide role set).
     */
    public function index(Tenant $tenant)
    {
        $users = User::where('tenant_id', $tenant->id)->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => UserResource::collection($users),
            'message' => null,
        ]);
    }

    public function store(StoreTenantUserRequest $request, Tenant $tenant)
    {
        $data = $request->validated();

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'data' => new UserResource($user),
            'message' => 'Akun pengguna berhasil dibuat.',
        ], 201);
    }

    public function update(UpdateTenantUserRequest $request, Tenant $tenant, User $user)
    {
        abort_unless($user->tenant_id === $tenant->id, 404);

        $data = $request->validated();

        $user->fill([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'is_active' => $data['is_active'] ?? $user->is_active,
        ]);

        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }

        $user->save();

        return response()->json([
            'success' => true,
            'data' => new UserResource($user),
            'message' => 'Akun pengguna berhasil diperbarui.',
        ]);
    }

    public function destroy(Tenant $tenant, User $user)
    {
        abort_unless($user->tenant_id === $tenant->id, 404);

        if (User::where('tenant_id', $tenant->id)->count() <= 1) {
            throw ValidationException::withMessages([
                'user' => ['Tenant harus memiliki minimal satu akun pengguna.'],
            ]);
        }

        $user->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Akun pengguna berhasil dihapus.',
        ]);
    }
}
