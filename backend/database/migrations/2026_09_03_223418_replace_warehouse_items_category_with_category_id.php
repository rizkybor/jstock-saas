<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The free-text `category` string is replaced by a proper
     * warehouse_categories relation — no existing rows had it populated yet
     * (Warehouse General only just shipped), so there's nothing to backfill.
     */
    public function up(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->dropColumn('category');
            $table->foreignId('warehouse_category_id')->nullable()->after('name')
                ->constrained('warehouse_categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('warehouse_category_id');
            $table->string('category', 100)->nullable()->after('name');
        });
    }
};
