<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sender;
use Illuminate\Http\Request;

class SenderController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Sender::orderBy('name')->get(['id', 'name']),
            'message' => null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $sender = Sender::create($data);

        return response()->json([
            'success' => true,
            'data' => $sender->only(['id', 'name']),
            'message' => 'Pengirim berhasil ditambahkan.',
        ], 201);
    }
}
