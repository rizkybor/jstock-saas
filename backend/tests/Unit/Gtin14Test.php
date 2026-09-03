<?php

namespace Tests\Unit;

use App\Support\Gtin14;
use PHPUnit\Framework\TestCase;

class Gtin14Test extends TestCase
{
    public function test_encode_produces_a_valid_checksummed_gtin14(): void
    {
        // Known-good GTIN-14 (00012345678905) confirmed against
        // barcodeapi.org's own itf14 renderer.
        $this->assertSame('00012345678905', Gtin14::encode(1234567890));
    }

    public function test_encode_pads_small_ids_to_fourteen_digits(): void
    {
        $code = Gtin14::encode(42);

        $this->assertSame(14, strlen($code));
        $this->assertMatchesRegularExpression('/^\d{14}$/', $code);
    }

    public function test_decode_recovers_the_original_id(): void
    {
        foreach ([1, 42, 12345678905, 999999999999] as $id) {
            $this->assertSame($id, Gtin14::decodeToId(Gtin14::encode($id)));
        }
    }

    public function test_decode_rejects_anything_that_is_not_a_valid_checksummed_code(): void
    {
        $this->assertNull(Gtin14::decodeToId('TRX-0001'));
        $this->assertNull(Gtin14::decodeToId('BRG-ABCDEFGH'));
        $this->assertNull(Gtin14::decodeToId('1234567890123')); // 13 digits
        $this->assertNull(Gtin14::decodeToId('123456789012345')); // 15 digits
        $this->assertNull(Gtin14::decodeToId('00012345678900')); // wrong check digit
    }
}
