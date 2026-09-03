<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Persist the overhead (freight, handling, etc.) baked into
     * Grand Total Cost so it survives edits — previously only used
     * transiently at create time and silently dropped on update.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('additional_cost', 14, 2)->default(0)->after('unit_cost');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('additional_cost');
        });
    }
};
