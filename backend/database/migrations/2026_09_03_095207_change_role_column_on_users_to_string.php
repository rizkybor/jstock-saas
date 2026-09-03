<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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
