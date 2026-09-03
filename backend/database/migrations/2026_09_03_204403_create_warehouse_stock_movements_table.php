<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only audit trail for every warehouse_stocks change — manual
     * stock in/out, a PO receipt, one leg of a transfer, or an opname
     * adjustment. reference_type/reference_id point back to whatever
     * caused it (nullable for a plain manual movement).
     */
    public function up(): void
    {
        Schema::create('warehouse_stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_location_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // "in" | "out" | "adjustment"
            $table->integer('qty');
            $table->string('reference_type', 30)->nullable(); // "manual" | "purchase_order" | "transfer" | "opname"
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_stock_movements');
    }
};
