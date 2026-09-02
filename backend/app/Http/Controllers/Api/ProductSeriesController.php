<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductSeriesResource;
use App\Models\ProductSeries;
use Illuminate\Http\Request;

class ProductSeriesController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => ProductSeriesResource::collection(ProductSeries::orderBy('name')->get()),
            'message' => null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $series = ProductSeries::create($data);

        return response()->json([
            'success' => true,
            'data' => new ProductSeriesResource($series),
            'message' => 'Product series berhasil ditambahkan.',
        ], 201);
    }
}
