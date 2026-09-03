<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which of the client's (possibly several) addresses this specific
     * transaction was shipped to — picked from the client's existing
     * addresses, or a newly-added one saved to the client at the same time.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('recipient_address_id')->nullable()->after('client_id')->constrained('client_addresses')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recipient_address_id');
        });
    }
};
