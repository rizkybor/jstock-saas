<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $clients = Client::query()
            ->withCount('addresses')
            ->when($request->string('q')->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('q');
                $query->where(function ($query) use ($search) {
                    $query->where('company_name', 'like', "%{$search}%")
                        ->orWhere('pic_name', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('is_active', $request->string('status')->toString() === 'active'))
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
        $data = $request->validated();
        $addresses = $data['addresses'] ?? [];
        unset($data['addresses']);

        $client = DB::transaction(function () use ($data, $addresses) {
            $client = Client::create([...$data, 'is_active' => true]);
            $client->addresses()->createMany($addresses);

            return $client;
        });

        return response()->json([
            'success' => true,
            'data' => new ClientResource($client->load('addresses')),
            'message' => 'Klien berhasil ditambahkan.',
        ], 201);
    }

    public function show(Client $client)
    {
        return response()->json([
            'success' => true,
            'data' => new ClientResource($client->load('addresses')),
            'message' => null,
        ]);
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $data = $request->validated();
        $addresses = $data['addresses'] ?? null;
        unset($data['addresses']);

        DB::transaction(function () use ($client, $data, $addresses) {
            $client->update($data);

            if ($addresses !== null) {
                $client->addresses()->delete();
                $client->addresses()->createMany($addresses);
            }
        });

        return response()->json([
            'success' => true,
            'data' => new ClientResource($client->fresh('addresses')),
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
