<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * invoice_number can now be typed manually per transaction (not just
     * server auto-generated), so two different tenants could plausibly pick
     * the same number — uniqueness needs to be per-tenant, not global.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('invoices_invoice_number_unique');
            $table->unique(['tenant_id', 'invoice_number']);
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'invoice_number']);
            $table->unique('invoice_number');
        });
    }
};
