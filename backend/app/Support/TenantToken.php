<?php

namespace App\Support;

/**
 * Encodes a tenant's numeric id into an opaque, URL-safe token and back.
 *
 * Deliberately NOT a JWS: a JWS payload is only signed, not encrypted — it
 * stays base64-readable to anyone, so it wouldn't keep the id secret. This
 * uses AES-256-CBC (confidentiality) with an HMAC (tamper detection),
 * keyed off the app's own APP_KEY so no extra secret needs managing.
 *
 * The IV is derived deterministically from the id (HMAC of the plaintext)
 * rather than randomized, so the same tenant always maps to the same token
 * — required for bookmarkable/shareable tenant URLs and a stable admin
 * table — while still being infeasible to reverse without the app key.
 */
class TenantToken
{
    public static function encode(int $id): string
    {
        $key = self::key();
        $plain = (string) $id;
        $iv = substr(hash_hmac('sha256', $plain, $key, true), 0, 16);
        $cipherText = openssl_encrypt($plain, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);
        $mac = substr(hash_hmac('sha256', $iv.$cipherText, $key, true), 0, 8);

        return self::base64UrlEncode($iv.$cipherText.$mac);
    }

    public static function decode(?string $token): ?int
    {
        if (! $token) {
            return null;
        }

        $raw = self::base64UrlDecode($token);
        if ($raw === false || strlen($raw) < 16 + 8) {
            return null;
        }

        $iv = substr($raw, 0, 16);
        $mac = substr($raw, -8);
        $cipherText = substr($raw, 16, -8);

        $key = self::key();
        $expectedMac = substr(hash_hmac('sha256', $iv.$cipherText, $key, true), 0, 8);
        if (! hash_equals($expectedMac, $mac)) {
            return null;
        }

        $plain = openssl_decrypt($cipherText, 'aes-256-cbc', $key, OPENSSL_RAW_DATA, $iv);

        return ($plain !== false && ctype_digit($plain)) ? (int) $plain : null;
    }

    private static function key(): string
    {
        return hash('sha256', 'tenant-token|'.config('app.key'), true);
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string|false
    {
        $padded = str_pad($data, strlen($data) + (4 - strlen($data) % 4) % 4, '=');

        return base64_decode(strtr($padded, '-_', '+/'), true);
    }
}
