<?php

use App\Http\Controllers\Api\Admin\ApprovalSettingsController as AdminApprovalSettingsController;
use App\Http\Controllers\Api\Admin\BarcodeSettingController as AdminBarcodeSettingController;
use App\Http\Controllers\Api\Admin\MenuSettingController as AdminMenuSettingController;
use App\Http\Controllers\Api\Admin\ModuleController as AdminModuleController;
use App\Http\Controllers\Api\Admin\PlanController as AdminPlanController;
use App\Http\Controllers\Api\Admin\RolePermissionController as AdminRolePermissionController;
use App\Http\Controllers\Api\Admin\TenantController as AdminTenantController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarcodeSettingController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductSeriesController;
use App\Http\Controllers\Api\PublicScanController;
use App\Http\Controllers\Api\RecipientController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SenderController;
use App\Http\Controllers\Api\TenantProfileController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\Warehouse\CategoryController as WarehouseCategoryController;
use App\Http\Controllers\Api\Warehouse\DashboardController as WarehouseDashboardController;
use App\Http\Controllers\Api\Warehouse\ItemController as WarehouseItemController;
use App\Http\Controllers\Api\Warehouse\LocationController as WarehouseLocationController;
use App\Http\Controllers\Api\Warehouse\PurchaseOrderController as WarehousePurchaseOrderController;
use App\Http\Controllers\Api\Warehouse\StockController as WarehouseStockController;
use App\Http\Controllers\Api\Warehouse\StockOpnameController as WarehouseStockOpnameController;
use App\Http\Controllers\Api\Warehouse\SupplierController as WarehouseSupplierController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', fn () => response()->json(['success' => true, 'message' => 'pong']));

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Landing endpoints for a scanned QR code/barcode label — deliberately
// outside auth:sanctum (a courier or warehouse worker scanning a physical
// label has no jstock account). Throttled since {tenant}/{uniqueId} or
// {tenant}/{trxNumber} could otherwise be brute-forced to enumerate
// records; see PublicScanController's docblock for the rest of the
// tenant-isolation and data-exposure safeguards.
Route::middleware('throttle:30,1')->group(function () {
    Route::get('/public/{tenant}/products/scan/{uniqueId}', [PublicScanController::class, 'product']);
    Route::get('/public/{tenant}/transactions/scan/{trxNumber}', [PublicScanController::class, 'transaction']);
    Route::get('/public/{tenant}/warehouse/items/scan/{uniqueId}', [PublicScanController::class, 'warehouseItem']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Self-service company profile — core/platform-level, not tied to any
    // module:<key>, so it works the same for an Inventory Gas Kalibrasi or
    // Warehouse General tenant. See TenantProfileController's docblock.
    Route::prefix('tenant')->group(function () {
        Route::get('/', [TenantProfileController::class, 'show'])->middleware('permission:tenant.view');
        Route::put('/', [TenantProfileController::class, 'update'])->middleware('permission:tenant.update');
        Route::post('/logo', [TenantProfileController::class, 'uploadLogo'])->middleware('permission:tenant.update');
        Route::delete('/logo', [TenantProfileController::class, 'destroyLogo'])->middleware('permission:tenant.update');
    });

    // Core/platform-level, like /tenant above — read by product, warehouse
    // item, and transaction create-forms alike, so it isn't nested inside
    // any single module:<key> gate (a Warehouse-only tenant has no
    // inventory-gas-kalibrasi permissions to satisfy a gate there).
    Route::get('/barcode-settings', [BarcodeSettingController::class, 'index']);

    // Everything below belongs to the "Inventory Gas Kalibrasi" module —
    // future modules (different business processes) get their own prefix
    // and their own module:<key> gate here, side by side with this one.
    Route::middleware('module:inventory-gas-kalibrasi')->group(function () {
        Route::middleware('menu:inventory-gas-kalibrasi,dashboard')->group(function () {
            Route::get('/dashboard/summary', [DashboardController::class, 'summary'])->middleware('permission:dashboard.view');
        });

        Route::middleware('menu:inventory-gas-kalibrasi,reports')->group(function () {
            Route::get('/reports/summary', [ReportController::class, 'summary'])->middleware('permission:reports.view');
        });

        Route::middleware('menu:inventory-gas-kalibrasi,clients')->group(function () {
            Route::get('/clients', [ClientController::class, 'index'])->middleware('permission:clients.view');
            Route::post('/clients', [ClientController::class, 'store'])->middleware('permission:clients.create');
            Route::get('/clients/{client}', [ClientController::class, 'show'])->middleware('permission:clients.view');
            Route::put('/clients/{client}', [ClientController::class, 'update'])->middleware('permission:clients.update');
            Route::delete('/clients/{client}', [ClientController::class, 'destroy'])->middleware('permission:clients.delete');
        });

        Route::middleware('menu:inventory-gas-kalibrasi,products')->group(function () {
            Route::get('/product-series', [ProductSeriesController::class, 'index'])->middleware('permission:product-series.view');
            Route::post('/product-series', [ProductSeriesController::class, 'store'])->middleware('permission:product-series.create');

            Route::get('/products', [ProductController::class, 'index'])->middleware('permission:products.view');
            Route::post('/products', [ProductController::class, 'store'])->middleware('permission:products.create');
            Route::get('/products/lookup/{uniqueId}', [ProductController::class, 'lookup'])->middleware('permission:products.view');
            Route::get('/products/{product}', [ProductController::class, 'show'])->middleware('permission:products.view');
            Route::put('/products/{product}', [ProductController::class, 'update'])->middleware('permission:products.update');
            Route::delete('/products/{product}', [ProductController::class, 'destroy'])->middleware('permission:products.delete');
        });

        Route::middleware('menu:inventory-gas-kalibrasi,transactions')->group(function () {
            Route::get('/users', [UserController::class, 'index'])->middleware('permission:transactions.view');

            Route::get('/senders', [SenderController::class, 'index'])->middleware('permission:transactions.view');
            Route::post('/senders', [SenderController::class, 'store'])->middleware('permission:transactions.create');

            Route::get('/recipients', [RecipientController::class, 'index'])->middleware('permission:transactions.view');
            Route::post('/recipients', [RecipientController::class, 'store'])->middleware('permission:transactions.create');

            Route::get('/transactions', [TransactionController::class, 'index'])->middleware('permission:transactions.view');
            Route::post('/transactions', [TransactionController::class, 'store'])->middleware('permission:transactions.create');
            Route::get('/transactions/next-number', [TransactionController::class, 'nextTrxNumber'])->middleware('permission:transactions.create');
            Route::get('/transactions/lookup/{trxNumber}', [TransactionController::class, 'lookup'])->middleware('permission:transactions.view');
            Route::get('/transactions/{transaction}', [TransactionController::class, 'show'])->middleware('permission:transactions.view');
            Route::patch('/transactions/{transaction}/approve', [TransactionController::class, 'approve'])->middleware('permission:transactions.approve');
            Route::patch('/transactions/{transaction}/reject', [TransactionController::class, 'reject'])->middleware('permission:transactions.approve');
            Route::patch('/transactions/{transaction}/ship', [TransactionController::class, 'markShipped'])->middleware('permission:transactions.approve');
            Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy'])->middleware('permission:transactions.delete');
        });
    });

    // "Warehouse General" module — a separate business process (basic item
    // master, multi-location stock, transfers, purchase orders, stock
    // opname) from Inventory Gas Kalibrasi above; entirely gated behind its
    // own module:<key>, side by side with it.
    Route::prefix('warehouse')->middleware('module:warehouse-general')->group(function () {
        Route::middleware('menu:warehouse-general,dashboard')->group(function () {
            Route::get('/dashboard/summary', [WarehouseDashboardController::class, 'summary'])->middleware('permission:warehouse-dashboard.view');
        });

        Route::middleware('menu:warehouse-general,locations')->group(function () {
            Route::get('/locations', [WarehouseLocationController::class, 'index'])->middleware('permission:warehouse-locations.view');
            Route::post('/locations', [WarehouseLocationController::class, 'store'])->middleware('permission:warehouse-locations.create');
            Route::put('/locations/{location}', [WarehouseLocationController::class, 'update'])->middleware('permission:warehouse-locations.update');
            Route::delete('/locations/{location}', [WarehouseLocationController::class, 'destroy'])->middleware('permission:warehouse-locations.delete');
        });

        Route::middleware('menu:warehouse-general,items')->group(function () {
            Route::get('/items', [WarehouseItemController::class, 'index'])->middleware('permission:warehouse-items.view');
            Route::post('/items', [WarehouseItemController::class, 'store'])->middleware('permission:warehouse-items.create');
            Route::get('/items/lookup/{uniqueId}', [WarehouseItemController::class, 'lookup'])->middleware('permission:warehouse-items.view');
            Route::get('/items/{item}', [WarehouseItemController::class, 'show'])->middleware('permission:warehouse-items.view');
            Route::put('/items/{item}', [WarehouseItemController::class, 'update'])->middleware('permission:warehouse-items.update');
            Route::delete('/items/{item}', [WarehouseItemController::class, 'destroy'])->middleware('permission:warehouse-items.delete');

            // Categories are a sub-concept of item management, not their own
            // menu — gated by the same warehouse-items permissions.
            Route::get('/categories', [WarehouseCategoryController::class, 'index'])->middleware('permission:warehouse-items.view');
            Route::post('/categories', [WarehouseCategoryController::class, 'store'])->middleware('permission:warehouse-items.create');
            Route::put('/categories/{category}', [WarehouseCategoryController::class, 'update'])->middleware('permission:warehouse-items.update');
            Route::delete('/categories/{category}', [WarehouseCategoryController::class, 'destroy'])->middleware('permission:warehouse-items.delete');
        });

        Route::middleware('menu:warehouse-general,stock')->group(function () {
            Route::get('/stock', [WarehouseStockController::class, 'index'])->middleware('permission:warehouse-stock.view');
            Route::get('/stock/movements', [WarehouseStockController::class, 'movements'])->middleware('permission:warehouse-stock.view');
            Route::post('/stock/move', [WarehouseStockController::class, 'move'])->middleware('permission:warehouse-stock.move');
            Route::post('/stock/transfer', [WarehouseStockController::class, 'transfer'])->middleware('permission:warehouse-stock.move');
        });

        Route::middleware('menu:warehouse-general,purchase-orders')->group(function () {
            Route::get('/suppliers', [WarehouseSupplierController::class, 'index'])->middleware('permission:warehouse-suppliers.view');
            Route::post('/suppliers', [WarehouseSupplierController::class, 'store'])->middleware('permission:warehouse-suppliers.create');
            Route::put('/suppliers/{supplier}', [WarehouseSupplierController::class, 'update'])->middleware('permission:warehouse-suppliers.update');
            Route::delete('/suppliers/{supplier}', [WarehouseSupplierController::class, 'destroy'])->middleware('permission:warehouse-suppliers.delete');

            Route::get('/purchase-orders', [WarehousePurchaseOrderController::class, 'index'])->middleware('permission:warehouse-purchase-orders.view');
            Route::post('/purchase-orders', [WarehousePurchaseOrderController::class, 'store'])->middleware('permission:warehouse-purchase-orders.create');
            Route::get('/purchase-orders/{purchaseOrder}', [WarehousePurchaseOrderController::class, 'show'])->middleware('permission:warehouse-purchase-orders.view');
            Route::patch('/purchase-orders/{purchaseOrder}/receive', [WarehousePurchaseOrderController::class, 'receive'])->middleware('permission:warehouse-purchase-orders.receive');
        });

        Route::middleware('menu:warehouse-general,stock-opname')->group(function () {
            Route::get('/stock-opname', [WarehouseStockOpnameController::class, 'index'])->middleware('permission:warehouse-stock.view');
            Route::post('/stock-opname', [WarehouseStockOpnameController::class, 'store'])->middleware('permission:warehouse-stock.opname');
        });
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
        Route::get('/tenants/{tenant}/modules/{module}/menu-settings', [AdminMenuSettingController::class, 'index']);
        Route::put('/tenants/{tenant}/modules/{module}/menu-settings', [AdminMenuSettingController::class, 'update']);
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

        Route::get('/tenants/{tenant}/barcode-settings', [AdminBarcodeSettingController::class, 'index']);
        Route::put('/tenants/{tenant}/barcode-settings', [AdminBarcodeSettingController::class, 'update']);

        Route::get('/tenants/{tenant}/permissions/catalog', [AdminRolePermissionController::class, 'catalog']);
        Route::get('/tenants/{tenant}/roles', [AdminRolePermissionController::class, 'index']);
        Route::put('/tenants/{tenant}/roles/{role}', [AdminRolePermissionController::class, 'update']);
        Route::delete('/tenants/{tenant}/roles/{role}', [AdminRolePermissionController::class, 'reset']);
    });
});
