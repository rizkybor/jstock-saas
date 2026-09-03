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

        // A barcode needs something to encode — auto-generate a unique_id
        // when a barcode type was requested but none was supplied.
        $uniqueId = $data['unique_id'] ?? (! empty($data['barcode_type']) ? $this->generateUniqueId() : null);

        $product = Product::create([
            'name' => $data['name'],
            'product_series_id' => $data['product_series_id'],
            'lot_batch' => $data['lot_batch'] ?? $this->generateLotBatch(),
            'unique_id' => $uniqueId,
            'barcode_type' => $data['barcode_type'] ?? null,
            'item_detail' => $data['item_detail'] ?? null,
            'unit_cost' => $data['unit_cost'],
            'additional_cost' => $data['additional_cost'] ?? 0,
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

    /**
     * Resolves the value encoded in a product's barcode (its unique_id)
     * back to the full product detail — what the barcode's scan-detail
     * page loads once opened.
     */
    public function lookup(string $uniqueId)
    {
        $product = Product::where('unique_id', $uniqueId)->with('series')->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product),
            'message' => null,
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $request->validated();

        $wantsBarcode = $data['barcode_type'] ?? $product->barcode_type;
        if (! empty($wantsBarcode) && empty($data['unique_id'] ?? $product->unique_id)) {
            $data['unique_id'] = $this->generateUniqueId();
        }

        if (isset($data['unit_cost']) || isset($data['stock_qty']) || isset($data['additional_cost'])) {
            $unitCost = $data['unit_cost'] ?? $product->unit_cost;
            $qty = $data['stock_qty'] ?? $product->stock_qty ?: 1;
            $additionalCost = $data['additional_cost'] ?? $product->additional_cost;
            [$grandTotalCost, $cogs] = $this->calculateCost($unitCost, $qty, $additionalCost);
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

    private function generateUniqueId(): string
    {
        do {
            $candidate = 'BRG-'.strtoupper(Str::random(8));
        } while (Product::withoutGlobalScopes()->where('unique_id', $candidate)->exists());

        return $candidate;
    }
}
