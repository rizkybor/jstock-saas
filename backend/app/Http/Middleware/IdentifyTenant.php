<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    /**
     * Bind the authenticated user's tenant to the container so the
     * BelongsToTenant global scope can filter every tenant-owned query.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($user = $request->user()) {
            app()->instance('tenant_id', $user->tenant_id);
        }

        return $next($request);
    }
}
