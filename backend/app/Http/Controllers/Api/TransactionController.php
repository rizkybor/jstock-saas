<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Recipient;
use App\Models\Sender;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $transactions = Transaction::query()
            ->with(['client', 'sender', 'recipient'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date('date_to')))
            ->latest()
            ->paginate($request->integer('limit', 10));

        return response()->json([
            'success' => true,
            'data' => TransactionResource::collection($transactions->items()),
            'message' => null,
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function store(StoreTransactionRequest $request)
    {
        $data = $request->validated();

        $transaction = DB::transaction(function () use ($data) {
            $senderId = $data['sender_id'] ?? Sender::create(['name' => $data['sender_name']])->id;

            $recipientId = $data['recipient_id'] ?? Recipient::create([
                'name' => $data['recipient_name'],
                'position' => $data['recipient_position'] ?? null,
                'company' => $data['recipient_company'] ?? null,
            ])->id;

            $products = Product::whereIn('id', collect($data['items'])->pluck('product_id'))
                ->get()
                ->keyBy('id');

            $total = 0;
            $items = [];

            foreach ($data['items'] as $item) {
                $product = $products[$item['product_id']];

                if ($item['qty'] > $product->stock_qty) {
                    throw ValidationException::withMessages([
                        'items' => ["Stok {$product->name} tidak mencukupi (tersedia {$product->stock_qty})."],
                    ]);
                }

                $subtotal = $product->unit_cost * $item['qty'];
                $total += $subtotal;

                $items[] = [
                    'product_id' => $product->id,
                    'qty' => $item['qty'],
                    'subtotal' => $subtotal,
                ];
            }

            $transaction = Transaction::create([
                'trx_number' => $this->generateTrxNumber(),
                'client_id' => $data['client_id'] ?? null,
                'sender_id' => $senderId,
                'recipient_id' => $recipientId,
                'status' => 'pending',
                'total' => $total,
            ]);

            $transaction->items()->createMany($items);

            return $transaction;
        });

        return response()->json([
            'success' => true,
            'data' => new TransactionResource($transaction->load(['client', 'sender', 'recipient', 'items.product'])),
            'message' => 'Transaksi berhasil dibuat dan menunggu approval.',
        ], 201);
    }

    public function show(Transaction $transaction)
    {
        return response()->json([
            'success' => true,
            'data' => new TransactionResource($transaction->load(['client', 'sender', 'recipient', 'items.product', 'invoice'])),
            'message' => null,
        ]);
    }

    public function approve(Request $request, Transaction $transaction)
    {
        abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi berstatus pending yang bisa di-approve.');

        $invoice = DB::transaction(function () use ($request, $transaction) {
            $transaction->load('items.product');

            foreach ($transaction->items as $item) {
                $item->product()->decrement('stock_qty', $item->qty);
            }

            $transaction->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);

            return Invoice::create([
                'transaction_id' => $transaction->id,
                'invoice_number' => 'INV-'.now()->format('Y').'-'.str_pad((string) $transaction->id, 4, '0', STR_PAD_LEFT),
            ]);
        });

        return response()->json([
            'success' => true,
            'data' => [
                'transaction' => new TransactionResource($transaction->fresh(['client', 'sender', 'recipient', 'items.product'])),
                'invoice' => $invoice,
            ],
            'message' => 'Transaksi berhasil di-approve, invoice dibuat.',
        ]);
    }

    public function reject(Request $request, Transaction $transaction)
    {
        abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi berstatus pending yang bisa di-reject.');

        $data = $request->validate([
            'rejection_note' => ['required', 'string', 'max:500'],
        ]);

        $transaction->update([
            'status' => 'rejected',
            'rejection_note' => $data['rejection_note'],
        ]);

        return response()->json([
            'success' => true,
            'data' => new TransactionResource($transaction),
            'message' => 'Transaksi ditolak.',
        ]);
    }

    public function destroy(Transaction $transaction)
    {
        abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi berstatus pending yang bisa dibatalkan.');

        $transaction->update(['status' => 'cancelled']);

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Transaksi dibatalkan.',
        ]);
    }

    private function generateTrxNumber(): string
    {
        do {
            $candidate = 'TRX-'.now()->format('Ymd').'-'.strtoupper(Str::random(5));
        } while (Transaction::withoutGlobalScopes()->where('trx_number', $candidate)->exists());

        return $candidate;
    }
}
