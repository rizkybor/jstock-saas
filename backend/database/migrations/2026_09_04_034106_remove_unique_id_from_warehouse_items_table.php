<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Warehouse item barcodes encode `sku` directly instead of a separate
     * auto-generated unique_id — sku is already unique per tenant (see
     * StoreItemRequest), so a second identifier was redundant.
     */
    public function up(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'unique_id']);
            $table->dropColumn('unique_id');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->string('unique_id')->nullable()->after('sku');
            $table->unique(['tenant_id', 'unique_id']);
        });
    }
};
