<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tenant roles are no longer a fixed enum: each tenant's Super-Admin-
     * managed accounts can carry any job title, and the Roles & Permission
     * screen lists whichever role names are actually in use.
     */
    public function up(): void
    {
        // On Postgres, enum() is implemented as a CHECK constraint that
        // ->change() doesn't drop on its own — leaving the old enum values
        // enforced even after the column becomes a plain string.
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 50)->default('operator')->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['super_admin', 'owner', 'manager', 'operator', 'viewer'])->default('operator')->change();
        });
    }
};
