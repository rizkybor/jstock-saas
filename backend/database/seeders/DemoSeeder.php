<?php

namespace Database\Seeders;

use App\Models\Client;
use App\Models\Module;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WarehouseCategory;
use App\Models\WarehouseItem;
use App\Models\WarehouseLocation;
use App\Models\WarehouseStock;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds a super admin plus one ready-to-click-around tenant per module, so a
 * client demo has real data to look at instead of an empty dashboard right
 * after deploy. Everything here is idempotent (updateOrCreate / firstOrCreate)
 * so re-running it on every deploy never duplicates data.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::updateOrCreate(
            ['email' => 'superadmin@jstock.demo'],
            ['tenant_id' => null, 'name' => 'Super Admin', 'password' => Hash::make('password'), 'role' => 'super_admin', 'is_active' => true],
        );

        $this->seedInventoryTenant();
        $this->seedWarehouseTenant();

        $this->command?->info('Demo accounts ready (password for all: "password"):');
        $this->command?->info('  super admin   -> superadmin@jstock.demo');
        $this->command?->info('  Inventory     -> owner@kalibrasidemo.test');
        $this->command?->info('  Warehouse     -> owner@gudangdemo.test');
    }

    private function seedInventoryTenant(): void
    {
        $tenant = Tenant::updateOrCreate(
            ['slug' => 'kalibrasi-demo'],
            ['name' => 'PT Kalibrasi Demo', 'status' => 'active'],
        );

        $this->attachModuleAndPlan($tenant, 'inventory-gas-kalibrasi');

        $owner = User::updateOrCreate(
            ['email' => 'owner@kalibrasidemo.test'],
            ['tenant_id' => $tenant->id, 'name' => 'Owner Kalibrasi', 'password' => Hash::make('password'), 'role' => 'owner', 'is_active' => true],
        );

        $client = Client::updateOrCreate(
            ['tenant_id' => $tenant->id, 'company_name' => 'Laboratorium Uji Nusantara'],
            ['pic_name' => 'Budi Santoso', 'phone' => '081234567890', 'email' => 'lab@nusantara.test', 'is_active' => true],
        );

        collect([
            ['name' => 'Gas Kalibrasi CH4 2.5%', 'lot_batch' => 'LOT-2026-001', 'unique_id' => 'GAS-CH4-001', 'stock_qty' => 42],
            ['name' => 'Gas Kalibrasi CO 50ppm', 'lot_batch' => 'LOT-2026-002', 'unique_id' => 'GAS-CO-002', 'stock_qty' => 18],
            ['name' => 'Gas Kalibrasi O2 20.9%', 'lot_batch' => 'LOT-2026-003', 'unique_id' => 'GAS-O2-003', 'stock_qty' => 7],
        ])->each(function (array $attrs) use ($tenant) {
            Product::updateOrCreate(
                ['tenant_id' => $tenant->id, 'unique_id' => $attrs['unique_id']],
                [
                    'name' => $attrs['name'],
                    'lot_batch' => $attrs['lot_batch'],
                    'unit_cost' => 145000,
                    'grand_total_cost' => 145000 * $attrs['stock_qty'],
                    'cogs' => 145000,
                    'stock_qty' => $attrs['stock_qty'],
                    'input_date' => now(),
                ],
            );
        });

        unset($client, $owner);
    }

    private function seedWarehouseTenant(): void
    {
        $tenant = Tenant::updateOrCreate(
            ['slug' => 'gudang-demo'],
            ['name' => 'CV Gudang Demo', 'status' => 'active'],
        );

        $this->attachModuleAndPlan($tenant, 'warehouse-general');

        User::updateOrCreate(
            ['email' => 'owner@gudangdemo.test'],
            ['tenant_id' => $tenant->id, 'name' => 'Owner Gudang', 'password' => Hash::make('password'), 'role' => 'owner', 'is_active' => true],
        );

        $category = WarehouseCategory::updateOrCreate(
            ['tenant_id' => $tenant->id, 'name' => 'Elektrikal'],
        );

        $location = WarehouseLocation::updateOrCreate(
            ['tenant_id' => $tenant->id, 'code' => 'GDG-UTAMA'],
            ['name' => 'Gudang Utama', 'type' => 'warehouse'],
        );

        collect([
            ['sku' => 'RAK-014', 'name' => 'Kabel NYM 3x2.5mm — 100m', 'unit' => 'Roll', 'qty' => 18],
            ['sku' => 'RAK-022', 'name' => 'Lampu LED 18W', 'unit' => 'Pcs', 'qty' => 120],
            ['sku' => 'RAK-035', 'name' => 'MCB 1 Phase 10A', 'unit' => 'Pcs', 'qty' => 35],
        ])->each(function (array $attrs) use ($tenant, $category, $location) {
            $item = WarehouseItem::updateOrCreate(
                ['tenant_id' => $tenant->id, 'sku' => $attrs['sku']],
                ['name' => $attrs['name'], 'warehouse_category_id' => $category->id, 'unit' => $attrs['unit']],
            );

            WarehouseStock::updateOrCreate(
                ['tenant_id' => $tenant->id, 'warehouse_item_id' => $item->id, 'warehouse_location_id' => $location->id],
                ['qty' => $attrs['qty']],
            );
        });
    }

    private function attachModuleAndPlan(Tenant $tenant, string $moduleKey): void
    {
        $module = Module::where('key', $moduleKey)->first();
        if ($module && ! $tenant->modules()->where('module_id', $module->id)->exists()) {
            $tenant->modules()->attach($module->id);
        }

        $plan = Plan::firstOrCreate(['slug' => 'pro'], ['name' => 'Pro', 'price' => 349000, 'max_users' => 20, 'max_transactions_per_month' => 1000]);

        Subscription::updateOrCreate(
            ['tenant_id' => $tenant->id, 'plan_id' => $plan->id],
            ['status' => 'active', 'started_at' => now(), 'ends_at' => now()->addYear()],
        );
    }
}
