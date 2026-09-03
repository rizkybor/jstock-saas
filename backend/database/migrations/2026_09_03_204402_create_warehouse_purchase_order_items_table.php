<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_purchase_order_items', function (Blueprint $table) {
            $table->id();
            // Explicit short constraint name: MySQL's 64-char identifier
            // limit rejects the auto-generated name for this column pair.
            $table->foreignId('warehouse_purchase_order_id')->constrained(null, null, 'wh_po_items_po_id_fk')->cascadeOnDelete();
            $table->foreignId('warehouse_item_id')->constrained()->cascadeOnDelete();
            $table->integer('qty_ordered');
            $table->integer('qty_received')->default(0);
            $table->decimal('unit_cost', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_purchase_order_items');
    }
};
