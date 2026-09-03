<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantBarcodeSetting;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BarcodeSettingController extends Controller
{
    /**
     * Per-tenant, per-feature (Tambah Barang / Transaksi Barang Keluar)
     * barcode autogeneration toggle + which types are offered.
     */
    public function index(Tenant $tenant)
    {
        return response()->json([
            'success' => true,
            'data' => TenantBarcodeSetting::effectiveSettingsFor($tenant->id),
            'message' => null,
        ]);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $data = $request->validate([
            'product.enabled' => ['required', 'boolean'],
            'product.allowed_types' => ['array'],
            'product.allowed_types.*' => [Rule::in(TenantBarcodeSetting::TYPES)],
            'transaction.enabled' => ['required', 'boolean'],
            'transaction.allowed_types' => ['array'],
            'transaction.allowed_types.*' => [Rule::in(TenantBarcodeSetting::TYPES)],
        ]);

        foreach (TenantBarcodeSetting::FEATURES as $feature) {
            TenantBarcodeSetting::updateOrCreate(
                ['tenant_id' => $tenant->id, 'feature' => $feature],
                [
                    'enabled' => $data[$feature]['enabled'],
                    'allowed_types' => $data[$feature]['allowed_types'] ?? [],
                ],
            );
        }

        return response()->json([
            'success' => true,
            'data' => TenantBarcodeSetting::effectiveSettingsFor($tenant->id),
            'message' => 'Pengaturan barcode berhasil disimpan.',
        ]);
    }
}
