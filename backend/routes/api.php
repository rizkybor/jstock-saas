<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => response()->json(['success' => true, 'message' => 'pong']));

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    Route::get('/clients', [ClientController::class, 'index'])->middleware('permission:clients.view');
    Route::post('/clients', [ClientController::class, 'store'])->middleware('permission:clients.create');
    Route::get('/clients/{client}', [ClientController::class, 'show'])->middleware('permission:clients.view');
    Route::put('/clients/{client}', [ClientController::class, 'update'])->middleware('permission:clients.update');
    Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->middleware('permission:clients.delete');
});
