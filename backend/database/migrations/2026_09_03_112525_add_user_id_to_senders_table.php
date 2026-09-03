<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Links a Sender record back to the tenant account it represents, so
     * picking the same staff member as Pengirim on repeat transactions
     * reuses one Sender row instead of creating a new one every time.
     */
    public function up(): void
    {
        Schema::table('senders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('tenant_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('senders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
