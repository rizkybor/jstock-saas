<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('warehouse_purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('po_number');
            $table->foreignId('warehouse_supplier_id')->constrained()->cascadeOnDelete();
            $table->foreignId('receiving_location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
            $table->string('status', 20)->default('draft'); // draft | ordered | partially_received | received | cancelled
            $table->date('ordered_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'po_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_purchase_orders');
    }
};
