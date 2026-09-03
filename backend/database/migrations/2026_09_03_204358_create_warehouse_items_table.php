<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Basic item master for "Warehouse General" — deliberately simpler
     * than Product (no LOT/Batch, no COGS calc): actual quantities live in
     * warehouse_stocks, keyed per location, not on this row.
     */
    public function up(): void
    {
        Schema::create('warehouse_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('sku', 100)->nullable();
            $table->string('name');
            $table->string('category', 100)->nullable();
            $table->string('unit', 20)->default('pcs');
            $table->decimal('price_buy', 15, 2)->nullable();
            $table->decimal('price_sell', 15, 2)->nullable();
            $table->integer('min_stock')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'sku']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_items');
    }
};
