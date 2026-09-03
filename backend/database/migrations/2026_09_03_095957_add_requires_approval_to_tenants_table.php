<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Whether transactions for this tenant need approval at all — off means
     * every transaction is auto-approved on creation. Defaults to true so
     * every existing tenant keeps today's single-step approve behavior.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->boolean('requires_approval')->default(true)->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('requires_approval');
        });
    }
};
