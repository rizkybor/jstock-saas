<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $clients = Client::query()
            ->when($request->string('q')->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('q');
                $query->where(function ($query) use ($search) {
                    $query->where('company_name', 'like', "%{$search}%")
                        ->orWhere('pic_name', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($request->integer('limit', 10));

        return response()->json([
            'success' => true,
            'data' => ClientResource::collection($clients->items()),
            'message' => null,
            'meta' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'total' => $clients->total(),
            ],
        ]);
    }

    public function store(StoreClientRequest $request)
    {
        $client = Client::create([...$request->validated(), 'is_active' => true]);

        return response()->json([
            'success' => true,
            'data' => new ClientResource($client),
            'message' => 'Klien berhasil ditambahkan.',
        ], 201);
    }

    public function show(Client $client)
    {
        return response()->json([
            'success' => true,
            'data' => new ClientResource($client),
            'message' => null,
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $client->update($request->validated());

        return response()->json([
            'success' => true,
            'data' => new ClientResource($client),
            'message' => 'Klien berhasil diperbarui.',
        ]);
    }

    public function destroy(Client $client)
    {
        $client->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Klien berhasil dinonaktifkan.',
        ]);
    }
}
