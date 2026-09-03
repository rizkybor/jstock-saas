<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A donated/inventory-grant item (e.g. dari hibah pemerintah) has no
     * purchase transaction backing it — price_buy/price_sell stay null for
     * these, and inventory_grant_source records who it came from.
     */
    public function up(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->boolean('is_inventory_grant')->default(false)->after('warehouse_category_id');
            $table->string('inventory_grant_source')->nullable()->after('is_inventory_grant');
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->dropColumn(['is_inventory_grant', 'inventory_grant_source']);
        });
    }
};
