<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;

class ModuleSeeder extends Seeder
{
    public function run(): void
    {
        Module::updateOrCreate(
            ['key' => 'inventory-gas-kalibrasi'],
            [
                'name' => 'Inventory Gas Kalibrasi',
                'description' => 'Master barang, transaksi keluar, dan invoice untuk stok gas kalibrasi berbasis LOT/Batch.',
                'is_active' => true,
            ]
        );

        Module::updateOrCreate(
            ['key' => 'warehouse-general'],
            [
                'name' => 'Warehouse General',
                'description' => 'Barang gudang umum, lokasi/rak, stok masuk-keluar, transfer antar lokasi, purchase order, dan stock opname.',
                'is_active' => true,
            ]
        );
    }
}
