<?php

namespace App\Support;

/**
 * ITF-14 barcodes only encode a numeric, mod-10-checksummed GTIN-14 —
 * barcodeapi.org's /api/itf14/{value} endpoint rejects (HTTP 400) anything
 * else, so our alphanumeric unique_id/trx_number values can never be used
 * directly. We derive a GTIN-14 deterministically from the record's own
 * numeric database id instead, and can decode a scanned one back to that
 * id — see App\Http\Controllers\Api\ProductController::lookup() and
 * TransactionController::lookup().
 */
class Gtin14
{
    public static function encode(int $id): string
    {
        $payload = str_pad((string) $id, 13, '0', STR_PAD_LEFT);

        return $payload.self::checkDigit($payload);
    }

    /**
     * Recovers the original id from a scanned/typed GTIN-14, or null if it
     * isn't a validly checksummed 14-digit code.
     */
    public static function decodeToId(string $code): ?int
    {
        if (! preg_match('/^\d{14}$/', $code)) {
            return null;
        }

        $payload = substr($code, 0, 13);

        if (self::checkDigit($payload) !== $code[13]) {
            return null;
        }

        return (int) $payload;
    }

    /**
     * Standard GTIN mod-10 check digit: from the rightmost digit of the
     * payload, alternate weights 3, 1, 3, 1...
     */
    private static function checkDigit(string $payload13): string
    {
        $sum = 0;
        foreach (str_split(strrev($payload13)) as $i => $digit) {
            $sum += (int) $digit * ($i % 2 === 0 ? 3 : 1);
        }

        return (string) ((10 - ($sum % 10)) % 10);
    }
}
