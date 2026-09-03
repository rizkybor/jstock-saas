<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Models\Product;
use App\Models\Transaction;

class DashboardController extends Controller
{
    /**
     * Summary tiles + the pending-approval queue for the Inventory Gas
     * Kalibrasi module's dashboard.
     */
    public function summary()
    {
        $pending = Transaction::with(['client', 'sender', 'recipient'])
            ->where('status', 'pending')
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'item_count' => Product::count(),
                'pending_count' => Transaction::where('status', 'pending')->count(),
                'transactions_this_month' => Transaction::whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)
                    ->count(),
                'pending_transactions' => TransactionResource::collection($pending),
            ],
            'message' => null,
        ]);
    }
}
