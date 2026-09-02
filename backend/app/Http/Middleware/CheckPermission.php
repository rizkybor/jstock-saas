<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Reject the request unless the authenticated user's role grants
     * the given permission (see config/permissions.php).
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        abort_unless($request->user()?->hasPermission($permission), 403, 'Anda tidak memiliki izin untuk aksi ini.');

        return $next($request);
    }
}
