<?php

if (! function_exists('tenant_id')) {
    /**
     * Resolve the current tenant id bound to the request lifecycle
     * by the IdentifyTenant middleware.
     */
    function tenant_id(): ?int
    {
        return app()->bound('tenant_id') ? app('tenant_id') : null;
    }
}
