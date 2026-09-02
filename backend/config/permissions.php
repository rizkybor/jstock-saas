<?php

/**
 * Role -> permission matrix, mirrors docs/Doc1-Analisis_Sistem_jstock.md
 * section 3.3 (Matriks Permission RBAC).
 */
return [
    'owner' => [
        'tenant.view', 'tenant.update',
        'users.view', 'users.create', 'users.update', 'users.delete',
        'billing.view', 'billing.manage',
        'clients.view', 'clients.create', 'clients.update', 'clients.delete',
        'products.view', 'products.create', 'products.update', 'products.delete',
        'product-series.view', 'product-series.create', 'product-series.update', 'product-series.delete',
        'transactions.view', 'transactions.create', 'transactions.update', 'transactions.delete', 'transactions.approve',
        'invoices.view', 'invoices.create', 'invoices.update', 'invoices.delete', 'invoices.download',
        'signatures.view', 'signatures.create', 'signatures.update', 'signatures.delete',
        'reports.view', 'reports.cogs',
        'dashboard.view',
    ],
    'manager' => [
        'tenant.view',
        'users.view',
        'billing.view',
        'clients.view', 'clients.create', 'clients.update', 'clients.delete',
        'products.view', 'products.create', 'products.update', 'products.delete',
        'product-series.view', 'product-series.create', 'product-series.update', 'product-series.delete',
        'transactions.view', 'transactions.create', 'transactions.update', 'transactions.delete', 'transactions.approve',
        'invoices.view', 'invoices.create', 'invoices.download',
        'signatures.view',
        'reports.view', 'reports.cogs',
        'dashboard.view',
    ],
    'operator' => [
        'clients.view', 'clients.create',
        'products.view', 'products.create',
        'product-series.view', 'product-series.create',
        'transactions.view', 'transactions.create',
        'invoices.download',
        'reports.view',
        'dashboard.view',
    ],
    'viewer' => [
        'clients.view',
        'products.view',
        'product-series.view',
        'transactions.view',
        'invoices.download',
        'reports.view',
        'dashboard.view',
    ],
    // Super admin operates at platform level, not tenant level — the
    // wildcard is resolved by User::hasPermission().
    'super_admin' => ['*'],
];
