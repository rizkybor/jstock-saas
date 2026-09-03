<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A one-off recipient (no client picked) still needs its address kept
     * with the transaction — but since it isn't tied to a client, it can't
     * live in client_addresses (client_id there is required). This snapshot
     * holds the same fields inline, scoped to just this transaction.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->json('recipient_address_snapshot')->nullable()->after('recipient_address_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('recipient_address_snapshot');
        });
    }
};
