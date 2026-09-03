<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Barcode type choices are now locked per feature — product labels are
     * QR-only (scanned by phone camera), transaction labels are
     * Code128/39-only (scanned by a handheld reader). Sanitize any
     * already-stored allowed_types / barcode_type values that fall outside
     * their feature's new allow-list, so old broader configuration can't
     * linger and contradict the UI.
     */
    private const FEATURE_TYPES = [
        'product' => ['qr'],
        'transaction' => ['128', '39'],
    ];

    public function up(): void
    {
        foreach (self::FEATURE_TYPES as $feature => $allowed) {
            DB::table('tenant_barcode_settings')
                ->where('feature', $feature)
                ->get()
                ->each(function ($row) use ($allowed) {
                    $current = collect(json_decode($row->allowed_types, true) ?? []);
                    $sanitized = $current->intersect($allowed)->values()->all();

                    if ($sanitized !== $current->all()) {
                        DB::table('tenant_barcode_settings')->where('id', $row->id)->update([
                            'allowed_types' => json_encode($sanitized),
                        ]);
                    }
                });
        }

        DB::table('products')->where('barcode_type', '!=', 'qr')->update(['barcode_type' => null]);
        DB::table('transactions')->whereNotIn('barcode_type', ['128', '39'])->update(['barcode_type' => null]);
    }

    public function down(): void
    {
        // Data cleanup only — nothing meaningful to reverse.
    }
};
