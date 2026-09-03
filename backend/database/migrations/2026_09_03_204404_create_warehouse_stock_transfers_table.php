<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One transfer of an item between two locations — recorded here for a
     * readable transfer history, and mirrored as two rows in
     * warehouse_stock_movements (an "out" at from_location, an "in" at
     * to_location) so the movement ledger stays a complete audit trail.
     */
    public function up(): void
    {
        Schema::create('warehouse_stock_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_location_id')->constrained('warehouse_locations')->cascadeOnDelete();
            $table->foreignId('to_location_id')->constrained('warehouse_locations')->cascadeOnDelete();
            $table->integer('qty');
            $table->text('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_stock_transfers');
    }
};
