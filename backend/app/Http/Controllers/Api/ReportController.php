<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Transaction;

class ReportController extends Controller
{
    /**
     * Consolidated report tiles (COGS, inventory value, transaction mix)
     * for the Inventory Gas Kalibrasi module's Laporan page.
     */
    public function summary()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'total_products' => Product::count(),
                'total_stock_value' => (float) Product::sum('grand_total_cost'),
                'total_cogs' => (float) Transaction::where('status', 'approved')->sum('total'),
                'transactions_approved' => Transaction::where('status', 'approved')->count(),
                'transactions_pending' => Transaction::where('status', 'pending')->count(),
                'transactions_rejected' => Transaction::where('status', 'rejected')->count(),
                'transactions_cancelled' => Transaction::where('status', 'cancelled')->count(),
            ],
            'message' => null,
        ]);
    }
}
