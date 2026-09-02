<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Recipient;
use Illuminate\Http\Request;

class RecipientController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => Recipient::orderBy('name')->get(['id', 'name', 'position', 'company']),
            'message' => null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'company' => ['nullable', 'string', 'max:255'],
        ]);

        $recipient = Recipient::create($data);

        return response()->json([
            'success' => true,
            'data' => $recipient->only(['id', 'name', 'position', 'company']),
            'message' => 'Penerima berhasil ditambahkan.',
        ], 201);
    }
}
