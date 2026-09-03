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
    }
}
