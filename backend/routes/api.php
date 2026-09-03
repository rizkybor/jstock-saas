<?php

use App\Http\Controllers\Api\Admin\ApprovalSettingsController as AdminApprovalSettingsController;
use App\Http\Controllers\Api\Admin\ModuleController as AdminModuleController;
use App\Http\Controllers\Api\Admin\PlanController as AdminPlanController;
use App\Http\Controllers\Api\Admin\RolePermissionController as AdminRolePermissionController;
use App\Http\Controllers\Api\Admin\TenantController as AdminTenantController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductSeriesController;
use App\Http\Controllers\Api\RecipientController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SenderController;
use App\Http\Controllers\Api\TransactionController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => response()->json(['success' => true, 'message' => 'pong']));

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Everything below belongs to the "Inventory Gas Kalibrasi" module —
    // future modules (different business processes) get their own prefix
    // and their own module:<key> gate here, side by side with this one.
    Route::middleware('module:inventory-gas-kalibrasi')->group(function () {
        Route::get('/dashboard/summary', [DashboardController::class, 'summary'])->middleware('permission:dashboard.view');
        Route::get('/reports/summary', [ReportController::class, 'summary'])->middleware('permission:reports.view');

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
    });

    Route::prefix('admin')->middleware('permission:admin.tenants.view')->group(function () {
        Route::get('/tenants', [AdminTenantController::class, 'index']);
        Route::post('/tenants', [AdminTenantController::class, 'store']);
        Route::get('/tenants/{tenant}', [AdminTenantController::class, 'show']);
        Route::put('/tenants/{tenant}', [AdminTenantController::class, 'update']);
        Route::patch('/tenants/{tenant}/suspend', [AdminTenantController::class, 'suspend']);
        Route::patch('/tenants/{tenant}/activate', [AdminTenantController::class, 'activate']);
        Route::get('/tenants/{tenant}/modules', [AdminTenantController::class, 'modules']);
        Route::post('/tenants/{tenant}/modules/{module}', [AdminTenantController::class, 'attachModule']);
        Route::delete('/tenants/{tenant}/modules/{module}', [AdminTenantController::class, 'detachModule']);
        Route::get('/tenants/{tenant}/subscription', [AdminTenantController::class, 'subscription']);
        Route::put('/tenants/{tenant}/subscription', [AdminTenantController::class, 'updateSubscription']);
        Route::get('/stats', [AdminTenantController::class, 'stats']);

        Route::get('/modules', [AdminModuleController::class, 'index']);
        Route::post('/modules', [AdminModuleController::class, 'store']);

        Route::get('/plans', [AdminPlanController::class, 'index']);
        Route::post('/plans', [AdminPlanController::class, 'store']);
        Route::put('/plans/{plan}', [AdminPlanController::class, 'update']);

        Route::get('/tenants/{tenant}/users', [AdminUserController::class, 'index']);
        Route::post('/tenants/{tenant}/users', [AdminUserController::class, 'store']);
        Route::put('/tenants/{tenant}/users/{user}', [AdminUserController::class, 'update']);
        Route::delete('/tenants/{tenant}/users/{user}', [AdminUserController::class, 'destroy']);

        Route::get('/tenants/{tenant}/approval-settings', [AdminApprovalSettingsController::class, 'show']);
        Route::put('/tenants/{tenant}/approval-settings', [AdminApprovalSettingsController::class, 'update']);

        Route::get('/permissions/catalog', [AdminRolePermissionController::class, 'catalog']);
        Route::get('/tenants/{tenant}/roles', [AdminRolePermissionController::class, 'index']);
        Route::put('/tenants/{tenant}/roles/{role}', [AdminRolePermissionController::class, 'update']);
        Route::delete('/tenants/{tenant}/roles/{role}', [AdminRolePermissionController::class, 'reset']);
    });
});
