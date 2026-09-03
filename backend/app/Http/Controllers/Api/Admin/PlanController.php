<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePlanRequest;
use App\Http\Requests\Admin\UpdatePlanRequest;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use Illuminate\Support\Str;

class PlanController extends Controller
{
    /** The platform-wide subscription plan catalog tenants are assigned from. */
    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => PlanResource::collection(Plan::orderBy('price')->get()),
            'message' => null,
        ]);
    }

    public function store(StorePlanRequest $request)
    {
        $data = $request->validated();

        $plan = Plan::create([
            ...$data,
            'slug' => $data['slug'] ?? Str::slug($data['name']),
        ]);

        return response()->json([
            'success' => true,
            'data' => new PlanResource($plan),
            'message' => 'Plan berhasil ditambahkan.',
        ], 201);
    }

    public function update(UpdatePlanRequest $request, Plan $plan)
    {
        $data = $request->validated();

        $plan->update([
            ...$data,
            'slug' => $data['slug'] ?? $plan->slug,
        ]);

        return response()->json([
            'success' => true,
            'data' => new PlanResource($plan),
            'message' => 'Plan berhasil diperbarui.',
        ]);
    }
}
