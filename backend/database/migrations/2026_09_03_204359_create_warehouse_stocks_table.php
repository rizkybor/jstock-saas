<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Current quantity of one item at one location — the single source of
     * truth for "how much stock is where". Every mutation (stock in/out,
     * transfer, PO receipt, opname) updates this table and also writes an
     * audit row to warehouse_stock_movements.
     */
    public function up(): void
    {
        Schema::create('warehouse_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_location_id')->constrained()->cascadeOnDelete();
            $table->integer('qty')->default(0);
            $table->timestamps();

            $table->unique(['warehouse_item_id', 'warehouse_location_id'], 'warehouse_stocks_item_location_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_stocks');
    }
};
