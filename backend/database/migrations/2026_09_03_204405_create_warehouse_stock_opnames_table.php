<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A physical stock count reconciled against the system's recorded
     * quantity — recording one snapshots both, computes the difference,
     * and immediately adjusts warehouse_stocks to match physical_qty
     * (logged as an "adjustment" movement).
     */
    public function up(): void
    {
        Schema::create('warehouse_stock_opnames', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_location_id')->constrained()->cascadeOnDelete();
            $table->integer('system_qty');
            $table->integer('physical_qty');
            $table->integer('difference');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_stock_opnames');
    }
};
