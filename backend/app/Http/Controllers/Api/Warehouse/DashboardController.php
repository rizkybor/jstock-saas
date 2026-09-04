<?php

namespace App\Http\Controllers\Api\Warehouse;

use App\Http\Controllers\Controller;
use App\Http\Resources\Warehouse\StockMovementResource;
use App\Models\WarehouseCategory;
use App\Models\WarehouseItem;
use App\Models\WarehouseLocation;
use App\Models\WarehousePurchaseOrder;
use App\Models\WarehouseStockMovement;

class DashboardController extends Controller
{
    /** Summary tiles + low-stock alert + recent activity for the Warehouse General module's dashboard. */
    public function summary()
    {
        // A left join keeps items that have no stock rows at all (qty
        // implicitly 0), which a stocks() relation query would silently
        // drop — those are exactly the ones most likely to be low-stock.
        $lowStockItems = WarehouseItem::query()
            ->select('warehouse_items.*')
            ->selectRaw('COALESCE(SUM(warehouse_stocks.qty), 0) as computed_stock')
            ->leftJoin('warehouse_stocks', 'warehouse_stocks.warehouse_item_id', '=', 'warehouse_items.id')
            ->whereNotNull('warehouse_items.min_stock')
            ->groupBy('warehouse_items.id')
            ->havingRaw('COALESCE(SUM(warehouse_stocks.qty), 0) < warehouse_items.min_stock')
            ->orderBy('computed_stock')
            ->take(5)
            ->get();

        $recentMovements = WarehouseStockMovement::with(['item', 'location', 'creator'])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'item_count' => WarehouseItem::count(),
                'category_count' => WarehouseCategory::count(),
                'location_count' => WarehouseLocation::count(),
                'low_stock_count' => $lowStockItems->count(),
                'pending_purchase_orders' => WarehousePurchaseOrder::whereIn('status', ['ordered', 'partially_received'])->count(),
                'low_stock_items' => $lowStockItems->map(fn (WarehouseItem $item) => [
                    'id' => $item->id,
                    'sku' => $item->sku,
                    'name' => $item->name,
                    'unit' => $item->unit,
                    'min_stock' => $item->min_stock,
                    'current_stock' => (int) $item->computed_stock,
                ])->values(),
                'recent_movements' => StockMovementResource::collection($recentMovements),
            ],
            'message' => null,
        ]);
    }
}
