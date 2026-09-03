<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'module_key', 'menu_key', 'enabled'])]
class TenantMenuSetting extends Model
{
    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Every menu Module::MENU_CATALOG defines for $moduleKey, mapped to
     * whether this tenant currently has it enabled — a menu with no stored
     * row defaults to enabled (Super Admin only needs to record overrides
     * that turn one off).
     *
     * @return array<string, bool>
     */
    public static function effectiveMenusFor(int $tenantId, string $moduleKey): array
    {
        $menuKeys = array_keys(Module::MENU_CATALOG[$moduleKey] ?? []);

        $overrides = static::where('tenant_id', $tenantId)
            ->where('module_key', $moduleKey)
            ->pluck('enabled', 'menu_key');

        return collect($menuKeys)->mapWithKeys(fn ($key) => [$key => $overrides->get($key, true)])->all();
    }

    /**
     * Whether a single menu is enabled for this tenant — what the `menu`
     * route middleware checks on every request to a menu-gated route.
     */
    public static function isEnabledFor(int $tenantId, string $moduleKey, string $menuKey): bool
    {
        return static::effectiveMenusFor($tenantId, $moduleKey)[$menuKey] ?? true;
    }
}
