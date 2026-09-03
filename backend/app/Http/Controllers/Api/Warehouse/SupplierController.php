<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\StoreSupplierRequest;
use App\Http\Requests\Warehouse\UpdateSupplierRequest;
use App\Http\Resources\Warehouse\SupplierResource;
use App\Models\WarehouseSupplier;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $suppliers = WarehouseSupplier::query()
            ->when($request->string('q')->isNotEmpty(), fn ($query) => $query->where('name', 'like', '%'.$request->string('q').'%'))
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => SupplierResource::collection($suppliers),
            'message' => null,
        ]);
    }

    public function store(StoreSupplierRequest $request)
    {
        $supplier = WarehouseSupplier::create($request->validated());

        return response()->json([
            'success' => true,
            'data' => new SupplierResource($supplier),
            'message' => 'Supplier berhasil ditambahkan.',
        ], 201);
    }

    public function update(UpdateSupplierRequest $request, WarehouseSupplier $supplier)
    {
        $supplier->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new SupplierResource($supplier),
            'message' => 'Supplier berhasil diperbarui.',
        ]);
    }

    public function destroy(WarehouseSupplier $supplier)
    {
        abort_if($supplier->purchaseOrders()->exists(), 422, 'Supplier ini masih memiliki riwayat Purchase Order.');

        $supplier->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Supplier berhasil dihapus.',
        ]);
    }
}
