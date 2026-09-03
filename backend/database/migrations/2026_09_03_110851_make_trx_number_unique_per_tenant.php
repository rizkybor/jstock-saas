<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * trx_number moves from a random-suffixed, globally-unique value to a
     * simple per-tenant sequential counter (TRX-0001, TRX-0002, ...) so the
     * "Transaksi Barang Keluar" page can show the next number before the
     * transaction is even submitted. Two tenants can now share the same
     * number, so uniqueness becomes per-tenant instead of global.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique('transactions_trx_number_unique');
            $table->unique(['tenant_id', 'trx_number']);
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'trx_number']);
            $table->unique('trx_number');
        });
    }
};
