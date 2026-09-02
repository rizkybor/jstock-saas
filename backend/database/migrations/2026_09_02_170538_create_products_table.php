<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_series_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('lot_batch')->nullable();
            $table->string('unique_id')->nullable();
            $table->decimal('unit_cost', 14, 2)->default(0);
            $table->decimal('grand_total_cost', 14, 2)->default(0);
            $table->decimal('cogs', 14, 2)->default(0);
            $table->date('input_date')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'lot_batch', 'unique_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
