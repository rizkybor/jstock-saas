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
        abort_unless($tenant->hasModule($moduleKey), 403, 'Modul ini tidak aktif untuk perusahaan Anda. Hubungi admin jstock.');

        return $next($request);
    }
}
