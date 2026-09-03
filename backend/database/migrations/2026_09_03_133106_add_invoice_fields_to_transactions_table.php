<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Captured on Transaksi Barang Keluar at creation time (not left to be
     * auto-generated at approval) so the approver can see it on the
     * Approve/Reject modal before deciding.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('invoice_number')->nullable()->after('total');
            $table->boolean('no_invoice')->default(false)->after('invoice_number');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['invoice_number', 'no_invoice']);
        });
    }
};
