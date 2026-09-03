<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantHasModule
{
    /**
     * Gate module-specific business routes (e.g. Inventory Gas Kalibrasi's
     * clients/products/transactions) behind the tenant's module entitlement,
     * set by the platform Super Admin per subscribing company.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $moduleKey): Response
    {
        $tenant = $request->user()?->tenant;

        abort_if(! $tenant, 403, 'Fitur ini hanya tersedia untuk akun tenant.');

        // Login blocks a suspended tenant, but a token issued beforehand
        // keeps working until it expires — re-check on every module-gated
        // request so a suspension actually cuts off business access.
        abort_if($tenant->status === 'suspended', 403, 'Akun perusahaan Anda sedang disuspend. Hubungi admin jstock.');

        abort_unless($tenant->hasModule($moduleKey), 403, 'Modul ini tidak aktif untuk perusahaan Anda. Hubungi admin jstock.');

        return $next($request);
    }
}
