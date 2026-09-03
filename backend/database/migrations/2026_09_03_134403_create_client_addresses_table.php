<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A client can have several addresses (Rumah, Kantor, or any custom
     * label). Province/regency/district/village come from the emsifa
     * wilayah Indonesia API — both the id and the resolved name are stored
     * so the address still displays correctly without re-querying that API.
     */
    public function up(): void
    {
        Schema::create('client_addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->string('province_id', 10)->nullable();
            $table->string('province_name')->nullable();
            $table->string('regency_id', 10)->nullable();
            $table->string('regency_name')->nullable();
            $table->string('district_id', 10)->nullable();
            $table->string('district_name')->nullable();
            $table->string('village_id', 10)->nullable();
            $table->string('village_name')->nullable();
            $table->text('detail')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_addresses');
    }
};
