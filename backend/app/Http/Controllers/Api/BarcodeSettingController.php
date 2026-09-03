<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantBarcodeSetting;
use Illuminate\Http\Request;

class BarcodeSettingController extends Controller
{
    /** What this tenant's Tambah Barang / Transaksi Barang Keluar forms may offer for barcodes. */
    public function index(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => TenantBarcodeSetting::effectiveSettingsFor($request->user()->tenant_id),
            'message' => null,
        ]);
    }
}
