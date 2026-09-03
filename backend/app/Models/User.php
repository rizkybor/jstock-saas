<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Concerns\BelongsToTenant;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'tenant_id', 'role', 'is_active'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use BelongsToTenant, HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    /**
     * A tenant's Super-Admin-defined override (tenant_role_permissions) wins
     * over the platform default (config/permissions.php) when present —
     * every tenant starts on the default until Super Admin customizes a
     * role for it. super_admin itself is never overridable.
     *
     * @return array<int, string>
     */
    public function permissions(): array
    {
        if ($this->role === 'super_admin') {
            return config('permissions.super_admin', ['*']);
        }

        $custom = TenantRolePermission::where('tenant_id', $this->tenant_id)
            ->where('role', $this->role)
            ->pluck('permission')
            ->all();

        return $custom ?: config("permissions.{$this->role}", []);
    }

    public function hasPermission(string $permission): bool
    {
        $permissions = $this->permissions();

        return in_array('*', $permissions, true) || in_array($permission, $permissions, true);
    }
}
