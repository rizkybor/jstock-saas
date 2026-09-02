<?php

use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\IdentifyTenant;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->appendToGroup('api', [
            IdentifyTenant::class,
        ]);

        // IdentifyTenant must bind the tenant to the container before Laravel
        // resolves any {model} route parameter, otherwise implicit route-model
        // binding runs unscoped and BelongsToTenant silently lets any tenant's
        // record through. Authenticate still runs first so $request->user()
        // is available.
        $middleware->prependToPriorityList(
            before: SubstituteBindings::class,
            prepend: IdentifyTenant::class,
        );

        $middleware->alias([
            'permission' => CheckPermission::class,
        ]);

        // jstock is an API-only backend: unauthenticated requests must
        // always receive a JSON 401, never a redirect to a "login" route.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $e->getMessage() ?: 'Terjadi kesalahan.',
            ], $e->getStatusCode());
        });
    })->create();
