<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Same province/regency/district/village shape as client_addresses —
     * "Alamat" on the tenant profile now uses the same cascading wilayah
     * picker instead of a single free-text field. The existing `address`
     * column is kept and repurposed as the street-level detail text.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('province_id', 10)->nullable()->after('address');
            $table->string('province_name')->nullable()->after('province_id');
            $table->string('regency_id', 10)->nullable()->after('province_name');
            $table->string('regency_name')->nullable()->after('regency_id');
            $table->string('district_id', 10)->nullable()->after('regency_name');
            $table->string('district_name')->nullable()->after('district_id');
            $table->string('village_id', 10)->nullable()->after('district_name');
            $table->string('village_name')->nullable()->after('village_id');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'province_id', 'province_name', 'regency_id', 'regency_name',
                'district_id', 'district_name', 'village_id', 'village_name',
            ]);
        });
    }
};
