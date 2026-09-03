<?php

namespace Tests\Concerns;

use App\Models\Module;
use App\Models\Tenant;

/**
 * Feature tests build tenants directly (no ModuleSeeder in RefreshDatabase),
 * so any test hitting an Inventory Gas Kalibrasi route must explicitly grant
 * the module or it 403s at EnsureTenantHasModule.
 */
trait HasInventoryModule
{
    protected function enableInventoryModule(Tenant $tenant): void
    {
        $module = Module::firstOrCreate(
            ['key' => 'inventory-gas-kalibrasi'],
            ['name' => 'Inventory Gas Kalibrasi', 'is_active' => true]
        );

        $tenant->modules()->syncWithoutDetaching([$module->id]);
    }
}
