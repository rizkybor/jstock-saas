<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $products = Product::query()
            ->with('series')
            ->when($request->string('q')->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('q');
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('lot_batch', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('product_series_id'), fn ($query) => $query->where('product_series_id', $request->integer('product_series_id')))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('input_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('input_date', '<=', $request->date('date_to')))
            ->latest()
            ->paginate($request->integer('limit', 10));

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products->items()),
            'message' => null,
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function store(StoreProductRequest $request)
    {
        $data = $request->validated();

        [$grandTotalCost, $cogs] = $this->calculateCost($data['unit_cost'], $data['quantity'], $data['additional_cost'] ?? 0);

        $product = Product::create([
            'name' => $data['name'],
            'product_series_id' => $data['product_series_id'] ?? null,
            'lot_batch' => $data['lot_batch'] ?? $this->generateLotBatch(),
            'unique_id' => $data['unique_id'] ?? null,
            'item_detail' => $data['item_detail'] ?? null,
            'unit_cost' => $data['unit_cost'],
            'grand_total_cost' => $grandTotalCost,
            'cogs' => $cogs,
            'stock_qty' => $data['quantity'],
            'input_date' => $data['input_date'] ?? now()->toDateString(),
        ]);

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->load('series')),
            'message' => 'Barang berhasil ditambahkan.',
        ], 201);
    }

    public function show(Product $product)
    {
        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->load('series')),
            'message' => null,
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $request->validated();

        if (isset($data['unit_cost'])) {
            $qty = $data['stock_qty'] ?? $product->stock_qty ?: 1;
            [$grandTotalCost, $cogs] = $this->calculateCost($data['unit_cost'], $qty, 0);
            $data['grand_total_cost'] = $grandTotalCost;
            $data['cogs'] = $cogs;
        }

        $product->update($data);

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product->load('series')),
            'message' => 'Barang berhasil diperbarui.',
        ]);
    }

    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Barang berhasil dihapus.',
        ]);
    }

    /**
     * Grand Total Cost = (unit cost x quantity) + additional cost (freight, handling, etc).
     * COGS = Grand Total Cost / quantity, i.e. the landed cost per unit.
     *
     * @return array{0: float, 1: float}
     */
    private function calculateCost(float $unitCost, int $quantity, float $additionalCost): array
    {
        $grandTotalCost = ($unitCost * $quantity) + $additionalCost;
        $cogs = $quantity > 0 ? round($grandTotalCost / $quantity, 2) : 0;

        return [round($grandTotalCost, 2), $cogs];
    }

    private function generateLotBatch(): string
    {
        do {
            $candidate = 'LOT-'.now()->format('Ymd').'-'.strtoupper(Str::random(4));
        } while (Product::withoutGlobalScopes()->where('lot_batch', $candidate)->exists());

        return $candidate;
    }
}
