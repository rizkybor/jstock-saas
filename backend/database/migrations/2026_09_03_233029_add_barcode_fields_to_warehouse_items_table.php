<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Mirrors products.unique_id/barcode_type — see ProductController for the pattern this follows. */
    public function up(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->string('unique_id')->nullable()->after('sku');
            $table->string('barcode_type', 20)->nullable()->after('unique_id');

            $table->unique(['tenant_id', 'unique_id']);
        });
    }

    public function down(): void
    {
        Schema::table('warehouse_items', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'unique_id']);
            $table->dropColumn(['unique_id', 'barcode_type']);
        });
    }
};
