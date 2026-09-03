<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Http\Resources\Warehouse\StockResource;
use App\Models\WarehouseItem;
use App\Models\WarehouseLocation;
use App\Models\WarehouseStock;
use App\Models\WarehouseStockMovement;
use App\Models\WarehouseStockTransfer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StockController extends Controller
{
    /** Current quantity of every item at every location it's stocked in. */
    public function index(Request $request)
    {
        $stocks = WarehouseStock::query()
            ->with(['item', 'location'])
            ->when($request->filled('warehouse_item_id'), fn ($query) => $query->where('warehouse_item_id', $request->integer('warehouse_item_id')))
            ->when($request->filled('warehouse_location_id'), fn ($query) => $query->where('warehouse_location_id', $request->integer('warehouse_location_id')))
            ->get();

        return response()->json([
            'success' => true,
            'data' => StockResource::collection($stocks),
            'message' => null,
        ]);
    }

    public function movements(Request $request)
    {
        $movements = WarehouseStockMovement::query()
            ->with(['item', 'location', 'creator'])
            ->when($request->filled('warehouse_item_id'), fn ($query) => $query->where('warehouse_item_id', $request->integer('warehouse_item_id')))
            ->when($request->filled('warehouse_location_id'), fn ($query) => $query->where('warehouse_location_id', $request->integer('warehouse_location_id')))
            ->latest()
            ->paginate($request->integer('limit', 15));

        return response()->json([
            'success' => true,
            'data' => StockMovementResource::collection($movements->items()),
            'message' => null,
            'meta' => [
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'total' => $movements->total(),
            ],
        ]);
    }

    /** Manual stock in/out — the "Stok Masuk & Keluar" feature. */
    public function move(Request $request)
    {
        $data = $request->validate([
            'warehouse_item_id' => ['required', Rule::exists('warehouse_items', 'id')->where('tenant_id', tenant_id())],
            'warehouse_location_id' => ['required', Rule::exists('warehouse_locations', 'id')->where('tenant_id', tenant_id())],
            'type' => ['required', Rule::in(['in', 'out'])],
            'qty' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $movement = DB::transaction(function () use ($data, $request) {
            $stock = WarehouseStock::firstOrCreate(
                ['warehouse_item_id' => $data['warehouse_item_id'], 'warehouse_location_id' => $data['warehouse_location_id']],
                ['qty' => 0],
            );

            if ($data['type'] === 'out' && $stock->qty < $data['qty']) {
                throw ValidationException::withMessages([
                    'qty' => ["Stok tidak mencukupi (tersedia {$stock->qty})."],
                ]);
            }

            $stock->increment('qty', $data['type'] === 'in' ? $data['qty'] : -$data['qty']);

            return WarehouseStockMovement::create([
                'warehouse_item_id' => $data['warehouse_item_id'],
                'warehouse_location_id' => $data['warehouse_location_id'],
                'type' => $data['type'],
                'qty' => $data['qty'],
                'reference_type' => 'manual',
                'note' => $data['note'] ?? null,
                'created_by' => $request->user()->id,
            ]);
        });

        return response()->json([
            'success' => true,
            'data' => new StockMovementResource($movement->load(['item', 'location'])),
            'message' => $data['type'] === 'in' ? 'Stok masuk berhasil dicatat.' : 'Stok keluar berhasil dicatat.',
        ], 201);
    }

    /** Move an item's stock from one location to another. */
    public function transfer(Request $request)
    {
        $data = $request->validate([
            'warehouse_item_id' => ['required', Rule::exists('warehouse_items', 'id')->where('tenant_id', tenant_id())],
            'from_location_id' => ['required', 'different:to_location_id', Rule::exists('warehouse_locations', 'id')->where('tenant_id', tenant_id())],
            'to_location_id' => ['required', Rule::exists('warehouse_locations', 'id')->where('tenant_id', tenant_id())],
            'qty' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $transfer = DB::transaction(function () use ($data, $request) {
            $fromStock = WarehouseStock::firstOrCreate(
                ['warehouse_item_id' => $data['warehouse_item_id'], 'warehouse_location_id' => $data['from_location_id']],
                ['qty' => 0],
            );

            if ($fromStock->qty < $data['qty']) {
                throw ValidationException::withMessages([
                    'qty' => ["Stok di lokasi asal tidak mencukupi (tersedia {$fromStock->qty})."],
                ]);
            }

            $toStock = WarehouseStock::firstOrCreate(
                ['warehouse_item_id' => $data['warehouse_item_id'], 'warehouse_location_id' => $data['to_location_id']],
                ['qty' => 0],
            );

            $fromStock->decrement('qty', $data['qty']);
            $toStock->increment('qty', $data['qty']);

            $transfer = WarehouseStockTransfer::create([
                'warehouse_item_id' => $data['warehouse_item_id'],
                'from_location_id' => $data['from_location_id'],
                'to_location_id' => $data['to_location_id'],
                'qty' => $data['qty'],
                'note' => $data['note'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ([
                ['location_id' => $data['from_location_id'], 'type' => 'out'],
                ['location_id' => $data['to_location_id'], 'type' => 'in'],
            ] as $leg) {
                WarehouseStockMovement::create([
                    'warehouse_item_id' => $data['warehouse_item_id'],
                    'warehouse_location_id' => $leg['location_id'],
                    'type' => $leg['type'],
                    'qty' => $data['qty'],
                    'reference_type' => 'transfer',
                    'reference_id' => $transfer->id,
                    'created_by' => $request->user()->id,
                ]);
            }

            return $transfer;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $transfer->id,
                'qty' => $transfer->qty,
                'from_location' => WarehouseLocation::find($data['from_location_id'])?->only(['id', 'name']),
                'to_location' => WarehouseLocation::find($data['to_location_id'])?->only(['id', 'name']),
                'item' => WarehouseItem::find($data['warehouse_item_id'])?->only(['id', 'name']),
            ],
            'message' => 'Transfer stok berhasil dicatat.',
        ], 201);
    }
}
