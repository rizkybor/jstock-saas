<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['key', 'name', 'description', 'is_active'])]
class Module extends Model
{
    /**
     * The menus each module exposes in the tenant sidebar, keyed by module
     * key — what Super Admin's per-tenant menu-access configuration (see
     * TenantMenuSetting) offers checkboxes for, and what AppLayout on the
     * frontend uses to decide which nav links to render.
     *
     * @var array<string, array<string, string>>
     */
    public const MENU_CATALOG = [
        'inventory-gas-kalibrasi' => [
            'dashboard' => 'Dashboard',
            'clients' => 'Data Klien',
            'products' => 'Data Barang',
            'transactions' => 'Transaksi',
            'reports' => 'Laporan',
        ],
        'warehouse-general' => [
            'locations' => 'Gudang & Rak',
            'items' => 'Data Barang Gudang',
            'stock' => 'Stok Masuk & Keluar',
            'purchase-orders' => 'Purchase Order',
            'stock-opname' => 'Stock Opname',
        ],
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'tenant_modules');
    }
}
