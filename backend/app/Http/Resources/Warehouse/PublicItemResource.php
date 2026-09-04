<?php

namespace App\Http\Resources\Warehouse;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicItemResource extends JsonResource
{
    /**
     * The unauthenticated "scan this QR code" view of a warehouse item —
     * deliberately omits price_buy/price_sell (see PublicProductResource
     * for the same reasoning applied to the Inventory Gas Kalibrasi module):
     * a scanned label should confirm identity, not leak internal pricing.
     * Current stock and movement history are included, though — unlike
     * price, they're operational (not financial) information a warehouse
     * worker scanning the label needs to see.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'name' => $this->name,
            'sku' => $this->sku,
            'barcode_type' => $this->barcode_type,
            'category_name' => $this->whenLoaded('category', fn () => $this->category?->name),
            'unit' => $this->unit,
            'notes' => $this->notes,
            'total_stock' => $this->when($this->relationLoaded('stocks'), fn () => (int) $this->stocks->sum('qty')),
            'movements' => $this->when($this->relationLoaded('movements') && $this->relationLoaded('stocks'), fn () => $this->movementHistory()),
        ];
    }

    /**
     * Walks the (newest-first, contiguous) loaded movements backwards from
     * the item's current total stock to derive each entry's stock_before/
     * stock_after — a movement only records its own qty delta, not a
     * running balance, so the timeline has to be reconstructed here.
     *
     * @return array<int, array<string, mixed>>
     */
    private function movementHistory(): array
    {
        $running = (int) $this->stocks->sum('qty');

        return $this->movements->map(function ($movement) use (&$running) {
            $delta = match ($movement->type) {
                'in' => $movement->qty,
                'out' => -$movement->qty,
                'adjustment' => $movement->qty,
                default => 0,
            };

            $after = $running;
            $before = $running - $delta;
            $running = $before;

            return [
                'id' => $movement->id,
                'type' => $movement->type,
                'qty' => $movement->qty,
                'location_name' => $movement->location?->name,
                'stock_before' => $before,
                'stock_after' => $after,
                'created_at' => $movement->created_at,
            ];
        })->values()->all();
    }
}
