<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['tenant_id', 'feature', 'enabled', 'allowed_types'])]
class TenantBarcodeSetting extends Model
{
    /** The features that currently offer barcode autogeneration. */
    public const FEATURES = ['product', 'transaction', 'warehouse-item'];

    /** Canonical barcode type codes accepted by https://barcodeapi.org/. */
    public const TYPES = ['qr', '128', '39'];

    /**
     * Which of the above a tenant may pick from, per feature — a product or
     * warehouse item label is meant to be scanned by a phone camera (QR
     * only), while a transaction barcode is meant for a handheld scanner at
     * the point of shipment (linear types only, no QR).
     */
    public const FEATURE_TYPES = [
        'product' => ['qr'],
        'transaction' => ['128', '39'],
        'warehouse-item' => ['qr'],
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'allowed_types' => 'array',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * {product: {enabled, allowed_types}, transaction: {enabled, allowed_types}}
     * for the given tenant — defaults to disabled/empty for a feature that
     * has never been configured.
     *
     * @return array<string, array{enabled: bool, allowed_types: array<int, string>}>
     */
    public static function effectiveSettingsFor(int $tenantId): array
    {
        $settings = static::where('tenant_id', $tenantId)->get()->keyBy('feature');

        return collect(self::FEATURES)->mapWithKeys(function ($feature) use ($settings) {
            $setting = $settings->get($feature);

            return [$feature => [
                'enabled' => $setting?->enabled ?? false,
                'allowed_types' => $setting?->allowed_types ?? [],
            ]];
        })->all();
    }
}
