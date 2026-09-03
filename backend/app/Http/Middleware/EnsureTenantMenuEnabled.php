<?php

namespace App\Http\Middleware;

use App\Models\TenantMenuSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantMenuEnabled
{
    /**
     * Finer-grained gate nested inside a module's own `module:<key>` group —
     * the tenant already has the module, but Super Admin may have turned
     * one specific menu off for them (see TenantMenuSetting).
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $moduleKey, string $menuKey): Response
    {
        $tenantId = $request->user()?->tenant_id;

        abort_if(! $tenantId, 403, 'Fitur ini hanya tersedia untuk akun tenant.');
        abort_unless(
            TenantMenuSetting::isEnabledFor($tenantId, $moduleKey, $menuKey),
            403,
            'Menu ini dinonaktifkan untuk perusahaan Anda. Hubungi admin jstock.'
        );

        return $next($request);
    }
}
