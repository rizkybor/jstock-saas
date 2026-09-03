<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Requests\Warehouse\StorePurchaseOrderRequest;
use App\Http\Resources\Warehouse\PurchaseOrderResource;
use App\Models\WarehousePurchaseOrder;
use App\Models\WarehouseStock;
use App\Models\WarehouseStockMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PurchaseOrderController extends Controller
{
    private const WITH_RELATIONS = ['supplier', 'receivingLocation', 'items.item'];

    public function index(Request $request)
    {
        $orders = WarehousePurchaseOrder::query()
            ->with(['supplier', 'items'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->paginate($request->integer('limit', 10));

        return response()->json([
            'success' => true,
            'data' => PurchaseOrderResource::collection($orders->items()),
            'message' => null,
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function store(StorePurchaseOrderRequest $request)
    {
        $data = $request->validated();
        $tenant = $request->user()->tenant;

        $order = DB::transaction(function () use ($data, $tenant, $request) {
            $order = WarehousePurchaseOrder::create([
                'po_number' => $this->generatePoNumber($tenant->id),
                'warehouse_supplier_id' => $data['warehouse_supplier_id'],
                'receiving_location_id' => $data['receiving_location_id'] ?? null,
                'status' => 'ordered',
                'ordered_at' => $data['ordered_at'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $order->items()->createMany(collect($data['items'])->map(fn ($item) => [
                'warehouse_item_id' => $item['warehouse_item_id'],
                'qty_ordered' => $item['qty_ordered'],
                'unit_cost' => $item['unit_cost'] ?? 0,
            ]));

            return $order;
        });

        return response()->json([
            'success' => true,
            'data' => new PurchaseOrderResource($order->load(self::WITH_RELATIONS)),
            'message' => 'Purchase Order berhasil dibuat.',
        ], 201);
    }

    public function show(WarehousePurchaseOrder $purchaseOrder)
    {
        return response()->json([
            'success' => true,
            'data' => new PurchaseOrderResource($purchaseOrder->load(self::WITH_RELATIONS)),
            'message' => null,
        ]);
    }

    /**
     * Receive some or all of a PO's ordered quantities into stock at
     * receiving_location_id — supports partial receipt across multiple calls.
     */
    public function receive(Request $request, WarehousePurchaseOrder $purchaseOrder)
    {
        abort_unless(in_array($purchaseOrder->status, ['ordered', 'partially_received'], true), 422, 'PO ini tidak bisa menerima barang lagi.');

        $data = $request->validate([
            'receiving_location_id' => [
                Rule::requiredIf(fn () => ! $purchaseOrder->receiving_location_id),
                Rule::exists('warehouse_locations', 'id')->where('tenant_id', tenant_id()),
            ],
            'items' => ['required', 'array', 'min:1'],
            'items.*.po_item_id' => ['required', Rule::exists('warehouse_purchase_order_items', 'id')->where('warehouse_purchase_order_id', $purchaseOrder->id)],
            'items.*.qty_received' => ['required', 'integer', 'min:1'],
        ]);

        $locationId = $data['receiving_location_id'] ?? $purchaseOrder->receiving_location_id;

        DB::transaction(function () use ($data, $purchaseOrder, $locationId, $request) {
            $poItems = $purchaseOrder->items()->get()->keyBy('id');

            foreach ($data['items'] as $line) {
                $poItem = $poItems[$line['po_item_id']];
                $remaining = $poItem->qty_ordered - $poItem->qty_received;

                if ($line['qty_received'] > $remaining) {
                    throw ValidationException::withMessages([
                        'items' => ["Qty diterima untuk \"{$poItem->item?->name}\" melebihi sisa pesanan ({$remaining})."],
                    ]);
                }

                $poItem->increment('qty_received', $line['qty_received']);

                $stock = WarehouseStock::firstOrCreate(
                    ['warehouse_item_id' => $poItem->warehouse_item_id, 'warehouse_location_id' => $locationId],
                    ['qty' => 0],
                );
                $stock->increment('qty', $line['qty_received']);

                WarehouseStockMovement::create([
                    'warehouse_item_id' => $poItem->warehouse_item_id,
                    'warehouse_location_id' => $locationId,
                    'type' => 'in',
                    'qty' => $line['qty_received'],
                    'reference_type' => 'purchase_order',
                    'reference_id' => $purchaseOrder->id,
                    'created_by' => $request->user()->id,
                ]);
            }

            $fresh = $purchaseOrder->fresh('items');
            $fullyReceived = $fresh->items->every(fn ($item) => $item->qty_received >= $item->qty_ordered);
            $anyReceived = $fresh->items->sum('qty_received') > 0;

            $purchaseOrder->update([
                'receiving_location_id' => $locationId,
                'status' => $fullyReceived ? 'received' : ($anyReceived ? 'partially_received' : $purchaseOrder->status),
                'received_at' => $fullyReceived ? now() : $purchaseOrder->received_at,
            ]);
        });

        return response()->json([
            'success' => true,
            'data' => new PurchaseOrderResource($purchaseOrder->fresh(self::WITH_RELATIONS)),
            'message' => 'Penerimaan barang berhasil dicatat.',
        ]);
    }

    /**
     * Per-tenant sequential counter (PO-0001, PO-0002, ...).
     */
    private function generatePoNumber(int $tenantId): string
    {
        $count = WarehousePurchaseOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->count();

        do {
            $count++;
            $candidate = 'PO-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
        } while (WarehousePurchaseOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('po_number', $candidate)->exists());

        return $candidate;
    }
}
