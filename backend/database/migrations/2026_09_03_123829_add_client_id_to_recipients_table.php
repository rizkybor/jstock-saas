<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Links a Recipient record back to the Client it represents, so picking
     * a client as "Nama Penerima" on repeat transactions reuses/refreshes
     * one Recipient row instead of creating a new one every time.
     */
    public function up(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            $table->foreignId('client_id')->nullable()->after('tenant_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('recipients', function (Blueprint $table) {
            $table->dropConstrainedForeignId('client_id');
        });
    }
};
