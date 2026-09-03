<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\StoreItemRequest;
use App\Http\Requests\Warehouse\UpdateItemRequest;
use App\Http\Resources\Warehouse\ItemResource;
use App\Models\WarehouseItem;
use Illuminate\Http\Request;

class ItemController extends Controller
{
    public function index(Request $request)
    {
        $items = WarehouseItem::query()
            ->with('stocks')
            ->when($request->string('q')->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('q');
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')))
            ->latest()
            ->paginate($request->integer('limit', 10));

        return response()->json([
            'success' => true,
            'data' => ItemResource::collection($items->items()),
            'message' => null,
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function store(StoreItemRequest $request)
    {
        $item = WarehouseItem::create($request->validated());

        return response()->json([
            'success' => true,
            'data' => new ItemResource($item),
            'message' => 'Barang gudang berhasil ditambahkan.',
        ], 201);
    }

    public function show(WarehouseItem $item)
    {
        return response()->json([
            'success' => true,
            'data' => new ItemResource($item->load(['stocks.location'])),
            'message' => null,
        ]);
    }

    public function update(UpdateItemRequest $request, WarehouseItem $item)
    {
        $item->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new ItemResource($item->load('stocks')),
            'message' => 'Barang gudang berhasil diperbarui.',
        ]);
    }

    public function destroy(WarehouseItem $item)
    {
        abort_if($item->stocks()->where('qty', '>', 0)->exists(), 422, 'Barang ini masih memiliki stok. Habiskan atau pindahkan stoknya dahulu.');

        $item->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Barang gudang berhasil dihapus.',
        ]);
    }
}
