<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;

class UserController extends Controller
{
    /**
     * This tenant's own active accounts — used to populate the "Pengirim"
     * dropdown on Transaksi Barang Keluar (who on staff handed the goods
     * over), scoped to the tenant automatically via the global scope.
     */
    public function index()
    {
        $users = User::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return response()->json([
            'success' => true,
            'data' => $users,
            'message' => null,
        ]);
    }
}
