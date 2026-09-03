<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Separate from the approval workflow's `status` (pending/approved/
     * rejected/cancelled) — this tracks physical delivery of an already-
     * approved transaction, flipped either by scanning its barcode at the
     * point of shipment or manually from the transaction detail modal.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('shipping_status', 20)->default('unshipped')->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('shipping_status');
        });
    }
};
