<?php

namespace Tests\Concerns;

use App\Models\Module;
use App\Models\Tenant;

/**
 * Feature tests build tenants directly (no ModuleSeeder in RefreshDatabase),
 * so any test hitting a Warehouse General route must explicitly grant the
 * module or it 403s at EnsureTenantHasModule.
 */
trait HasWarehouseModule
{
    protected function enableWarehouseModule(Tenant $tenant): void
    {
        $module = Module::firstOrCreate(
            ['key' => 'warehouse-general'],
            ['name' => 'Warehouse General', 'is_active' => true]
        );

        $tenant->modules()->syncWithoutDetaching([$module->id]);
    }
}
