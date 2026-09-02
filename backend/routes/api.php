<?php

use App\Http\Controllers\Api\Admin\TenantController as AdminTenantController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductSeriesController;
use App\Http\Controllers\Api\RecipientController;
use App\Http\Controllers\Api\SenderController;
use App\Http\Controllers\Api\TransactionController;
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

    Route::get('/product-series', [ProductSeriesController::class, 'index'])->middleware('permission:product-series.view');
    Route::post('/product-series', [ProductSeriesController::class, 'store'])->middleware('permission:product-series.create');

    Route::get('/products', [ProductController::class, 'index'])->middleware('permission:products.view');
    Route::post('/products', [ProductController::class, 'store'])->middleware('permission:products.create');
    Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('permission:products.view');
    Route::put('/products/{product}', [ProductController::class, 'update'])->middleware('permission:products.update');
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('permission:products.delete');

    Route::get('/senders', [SenderController::class, 'index'])->middleware('permission:transactions.view');
    Route::post('/senders', [SenderController::class, 'store'])->middleware('permission:transactions.create');

    Route::get('/recipients', [RecipientController::class, 'index'])->middleware('permission:transactions.view');
    Route::post('/recipients', [RecipientController::class, 'store'])->middleware('permission:transactions.create');

    Route::get('/transactions', [TransactionController::class, 'index'])->middleware('permission:transactions.view');
    Route::post('/transactions', [TransactionController::class, 'store'])->middleware('permission:transactions.create');
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show'])->middleware('permission:transactions.view');
    Route::patch('/transactions/{transaction}/approve', [TransactionController::class, 'approve'])->middleware('permission:transactions.approve');
    Route::patch('/transactions/{transaction}/reject', [TransactionController::class, 'reject'])->middleware('permission:transactions.approve');
    Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy'])->middleware('permission:transactions.delete');

    Route::prefix('admin')->middleware('permission:admin.tenants.view')->group(function () {
        Route::get('/tenants', [AdminTenantController::class, 'index']);
        Route::get('/tenants/{tenant}', [AdminTenantController::class, 'show']);
        Route::patch('/tenants/{tenant}/suspend', [AdminTenantController::class, 'suspend']);
        Route::patch('/tenants/{tenant}/activate', [AdminTenantController::class, 'activate']);
        Route::get('/stats', [AdminTenantController::class, 'stats']);
    });
});
