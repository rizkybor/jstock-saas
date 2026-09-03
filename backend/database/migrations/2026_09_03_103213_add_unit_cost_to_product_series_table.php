<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Jenis Gas" now carries its own price — Modal Tambah Barang picks a
     * series and derives Unit Cost from it instead of asking for it again.
     */
    public function up(): void
    {
        Schema::table('product_series', function (Blueprint $table) {
            $table->decimal('unit_cost', 14, 2)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('product_series', function (Blueprint $table) {
            $table->dropColumn('unit_cost');
        });
    }
};
