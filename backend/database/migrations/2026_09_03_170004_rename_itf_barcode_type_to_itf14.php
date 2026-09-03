<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * "itf" was never a real barcodeapi.org type (it silently rendered a
     * QR code) — the correct code is "itf14". Backfill any rows that
     * already picked the old, broken value.
     */
    public function up(): void
    {
        DB::table('products')->where('barcode_type', 'itf')->update(['barcode_type' => 'itf14']);
        DB::table('transactions')->where('barcode_type', 'itf')->update(['barcode_type' => 'itf14']);

        DB::table('tenant_barcode_settings')
            ->where('allowed_types', 'like', '%"itf"%')
            ->get()
            ->each(function ($row) {
                $types = collect(json_decode($row->allowed_types, true))
                    ->map(fn ($type) => $type === 'itf' ? 'itf14' : $type)
                    ->all();

                DB::table('tenant_barcode_settings')->where('id', $row->id)->update([
                    'allowed_types' => json_encode($types),
                ]);
            });
    }

    public function down(): void
    {
        DB::table('products')->where('barcode_type', 'itf14')->update(['barcode_type' => 'itf']);
        DB::table('transactions')->where('barcode_type', 'itf14')->update(['barcode_type' => 'itf']);

        DB::table('tenant_barcode_settings')
            ->where('allowed_types', 'like', '%"itf14"%')
            ->get()
            ->each(function ($row) {
                $types = collect(json_decode($row->allowed_types, true))
                    ->map(fn ($type) => $type === 'itf14' ? 'itf' : $type)
                    ->all();

                DB::table('tenant_barcode_settings')->where('id', $row->id)->update([
                    'allowed_types' => json_encode($types),
                ]);
            });
    }
};
