<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockOpnameResource;
use App\Models\WarehouseStock;
use App\Models\WarehouseStockMovement;
use App\Models\WarehouseStockOpname;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StockOpnameController extends Controller
{
    public function index(Request $request)
    {
        $opnames = WarehouseStockOpname::query()
            ->with(['item', 'location', 'creator'])
            ->latest()
            ->paginate($request->integer('limit', 15));

        return response()->json([
            'success' => true,
            'data' => StockOpnameResource::collection($opnames->items()),
            'message' => null,
            'meta' => [
                'current_page' => $opnames->currentPage(),
                'last_page' => $opnames->lastPage(),
                'total' => $opnames->total(),
            ],
        ]);
    }

    /**
     * Reconcile a physical count against the system's recorded quantity —
     * snapshots both, adjusts warehouse_stocks to match the count, and
     * logs the delta as an "adjustment" movement.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'warehouse_item_id' => ['required', Rule::exists('warehouse_items', 'id')->where('tenant_id', tenant_id())],
            'warehouse_location_id' => ['required', Rule::exists('warehouse_locations', 'id')->where('tenant_id', tenant_id())],
            'physical_qty' => ['required', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $opname = DB::transaction(function () use ($data, $request) {
            $stock = WarehouseStock::firstOrCreate(
                ['warehouse_item_id' => $data['warehouse_item_id'], 'warehouse_location_id' => $data['warehouse_location_id']],
                ['qty' => 0],
            );

            $systemQty = $stock->qty;
            $difference = $data['physical_qty'] - $systemQty;

            $stock->update(['qty' => $data['physical_qty']]);

            $opname = WarehouseStockOpname::create([
                'warehouse_item_id' => $data['warehouse_item_id'],
                'warehouse_location_id' => $data['warehouse_location_id'],
                'system_qty' => $systemQty,
                'physical_qty' => $data['physical_qty'],
                'difference' => $difference,
                'note' => $data['note'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            if ($difference !== 0) {
                WarehouseStockMovement::create([
                    'warehouse_item_id' => $data['warehouse_item_id'],
                    'warehouse_location_id' => $data['warehouse_location_id'],
                    'type' => 'adjustment',
                    'qty' => $difference,
                    'reference_type' => 'opname',
                    'reference_id' => $opname->id,
                    'created_by' => $request->user()->id,
                ]);
            }

            return $opname;
        });

        return response()->json([
            'success' => true,
            'data' => new StockOpnameResource($opname->load(['item', 'location'])),
            'message' => 'Stock opname berhasil dicatat.',
        ], 201);
    }
}
