<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\ModuleResource;
use App\Models\Module;
use Illuminate\Http\Request;

class ModuleController extends Controller
{
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => ModuleResource::collection(Module::orderBy('name')->get()),
            'message' => null,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'key' => ['required', 'string', 'max:100', 'alpha_dash', 'unique:modules,key'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $module = Module::create($data);

        return response()->json([
            'success' => true,
            'data' => new ModuleResource($module),
            'message' => 'Modul berhasil didaftarkan ke katalog platform.',
        ], 201);
    }
}
