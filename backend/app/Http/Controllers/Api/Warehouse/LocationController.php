<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\StoreLocationRequest;
use App\Http\Requests\Warehouse\UpdateLocationRequest;
use App\Http\Resources\Warehouse\LocationResource;
use App\Models\WarehouseLocation;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function index(Request $request)
    {
        $locations = WarehouseLocation::query()
            ->with('parent')
            ->when($request->string('q')->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('q');
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
                });
            })
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => LocationResource::collection($locations),
            'message' => null,
        ]);
    }

    public function store(StoreLocationRequest $request)
    {
        $location = WarehouseLocation::create($request->validated());

        return response()->json([
            'success' => true,
            'data' => new LocationResource($location),
            'message' => 'Lokasi gudang berhasil ditambahkan.',
        ], 201);
    }

    public function update(UpdateLocationRequest $request, WarehouseLocation $location)
    {
        $location->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new LocationResource($location->load('parent')),
            'message' => 'Lokasi gudang berhasil diperbarui.',
        ]);
    }

    public function destroy(WarehouseLocation $location)
    {
        abort_if($location->children()->exists(), 422, 'Lokasi ini masih memiliki sub-lokasi (rak). Hapus atau pindahkan dahulu.');
        abort_if($location->stocks()->where('qty', '>', 0)->exists(), 422, 'Lokasi ini masih memiliki stok barang. Pindahkan stoknya dahulu.');

        $location->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Lokasi gudang berhasil dihapus.',
        ]);
    }
}
