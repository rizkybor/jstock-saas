<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateTenantProfileRequest;
use App\Http\Resources\TenantResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Self-service company profile — the tenant's own Owner/Manager viewing
 * and editing their company details, gated by tenant.view/tenant.update,
 * separate from Super Admin's full tenant management under /admin/tenants.
 * Deliberately outside any module:<key> gate: a company profile isn't tied
 * to Inventory Gas Kalibrasi or Warehouse General specifically.
 */
class TenantProfileController extends Controller
{
    public function show(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => new TenantResource($request->user()->tenant),
            'message' => null,
        ]);
    }

    public function update(UpdateTenantProfileRequest $request)
    {
        $tenant = $request->user()->tenant;
        $tenant->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new TenantResource($tenant),
            'message' => 'Profil perusahaan berhasil diperbarui.',
        ]);
    }

    public function uploadLogo(Request $request)
    {
        $data = $request->validate([
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $tenant = $request->user()->tenant;

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
        }

        $tenant->update(['logo_path' => $data['logo']->store('tenant-logos', 'public')]);

        return response()->json([
            'success' => true,
            'data' => new TenantResource($tenant),
            'message' => 'Logo perusahaan berhasil diunggah.',
        ]);
    }

    public function destroyLogo(Request $request)
    {
        $tenant = $request->user()->tenant;

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
            $tenant->update(['logo_path' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => new TenantResource($tenant),
            'message' => 'Logo perusahaan berhasil dihapus.',
        ]);
    }
}
