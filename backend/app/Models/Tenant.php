<?php

namespace App\Models;

use App\Support\TenantToken;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

#[Fillable([
    'name', 'slug', 'email', 'phone', 'address',
    'province_id', 'province_name', 'regency_id', 'regency_name',
    'district_id', 'district_name', 'village_id', 'village_name',
    'logo_path', 'status', 'trial_ends_at', 'requires_approval',
])]
class Tenant extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'requires_approval' => 'boolean',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)
            ->whereIn('status', ['trialing', 'active'])
            ->latestOfMany();
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'tenant_modules');
    }

    public function hasModule(string $key): bool
    {
        return $this->modules()->where('key', $key)->exists();
    }

    public function approvalSteps(): HasMany
    {
        return $this->hasMany(ApprovalStep::class)->orderBy('sequence');
    }

    /**
     * The opaque, encrypted identifier exposed over the API/URLs instead of
     * the raw auto-increment id. See App\Support\TenantToken for why this
     * isn't a plain JWS.
     */
    public function getTokenAttribute(): string
    {
        return TenantToken::encode($this->id);
    }

    /**
     * Route-model binding resolves {tenant} route segments through this
     * token instead of the raw id — every existing route/controller keeps
     * working unmodified since Eloquent calls this transparently.
     */
    public function resolveRouteBinding($value, $field = null)
    {
        $id = TenantToken::decode($value);

        return $id ? $this->where('id', $id)->first() : null;
    }

    public static function generateUniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 1;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
