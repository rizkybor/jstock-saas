<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Per-tenant override of config/permissions.php. Empty for a tenant+role
     * means "use the platform default" — see User::permissions(). Only
     * Super Admin ever writes to this table (Api/Admin/RolePermissionController).
     */
    public function up(): void
    {
        Schema::create('tenant_role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->string('permission');
            $table->timestamps();

            $table->unique(['tenant_id', 'role', 'permission']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_role_permissions');
    }
};
