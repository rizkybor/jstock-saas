<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\StoreCategoryRequest;
use App\Http\Requests\Warehouse\UpdateCategoryRequest;
use App\Http\Resources\Warehouse\CategoryResource;
use App\Models\WarehouseCategory;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = WarehouseCategory::query()
            ->withCount('items')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => CategoryResource::collection($categories),
            'message' => null,
        ]);
    }

    public function store(StoreCategoryRequest $request)
    {
        $category = WarehouseCategory::create($request->validated());

        return response()->json([
            'success' => true,
            'data' => new CategoryResource($category),
            'message' => 'Kategori berhasil ditambahkan.',
        ], 201);
    }

    public function update(UpdateCategoryRequest $request, WarehouseCategory $category)
    {
        $category->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new CategoryResource($category),
            'message' => 'Kategori berhasil diperbarui.',
        ]);
    }

    public function destroy(WarehouseCategory $category)
    {
        abort_if($category->items()->exists(), 422, 'Kategori ini masih dipakai oleh barang. Pindahkan barangnya dahulu.');

        $category->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Kategori berhasil dihapus.',
        ]);
    }
}
