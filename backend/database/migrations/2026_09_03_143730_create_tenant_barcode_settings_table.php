<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Super Admin controls, per tenant and per feature (Tambah Barang vs
     * Transaksi Barang Keluar), whether barcode autogeneration is offered
     * at all and which barcode types (qr/128/39/itf) are allowed.
     */
    public function up(): void
    {
        Schema::create('tenant_barcode_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('feature', 20); // "product" | "transaction"
            $table->boolean('enabled')->default(false);
            $table->json('allowed_types')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'feature']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_barcode_settings');
    }
};
