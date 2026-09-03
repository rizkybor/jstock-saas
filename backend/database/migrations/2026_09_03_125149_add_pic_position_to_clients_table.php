<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Lets Transaksi Barang Keluar auto-fill Jabatan (not just Perusahaan) when a client is picked as recipient. */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('pic_position')->nullable()->after('pic_name');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('pic_position');
        });
    }
};
