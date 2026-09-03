<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\ApprovalStep;
use App\Models\Client;
use App\Models\ClientAddress;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Recipient;
use App\Models\Sender;
use App\Models\Transaction;
use App\Models\TransactionApproval;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionController extends Controller
{
    private const WITH_RELATIONS = ['client', 'sender', 'recipient', 'recipientAddress', 'currentApprovalStep', 'items.product', 'invoice', 'approvals.approver', 'approvals.approvalStep'];

    public function index(Request $request)
    {
        $transactions = Transaction::query()
            ->with(['client', 'sender', 'recipient', 'currentApprovalStep'])
            ->when($request->string('q')->isNotEmpty(), function ($query) use ($request) {
                $search = $request->string('q');
                $query->where(function ($query) use ($search) {
                    $query->where('trx_number', 'like', "%{$search}%")
                        ->orWhereHas('sender', fn ($q) => $q->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('recipient', fn ($q) => $q->where('name', 'like', "%{$search}%"));
                });
            })
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
        $tenant = $request->user()->tenant;

        $transaction = DB::transaction(function () use ($data, $tenant) {
            if (! empty($data['sender_id'])) {
                $senderId = $data['sender_id'];
            } elseif (! empty($data['sender_user_id'])) {
                // Reuse one Sender row per staff account instead of creating
                // a new one every time the same person is picked.
                $user = User::find($data['sender_user_id']);
                $senderId = Sender::firstOrCreate(['user_id' => $user->id], ['name' => $user->name])->id;
            } else {
                $senderId = Sender::create(['name' => $data['sender_name']])->id;
            }

            if (! empty($data['recipient_id'])) {
                $recipientId = $data['recipient_id'];
            } elseif (! empty($data['client_id'])) {
                // Reuse/refresh one Recipient row per client instead of
                // creating a new one every time the same client is picked.
                $client = Client::find($data['client_id']);
                $recipientId = Recipient::updateOrCreate(
                    ['client_id' => $client->id],
                    [
                        'name' => $client->pic_name,
                        'position' => $data['recipient_position'] ?? $client->pic_position,
                        'company' => $data['recipient_company'] ?? $client->company_name,
                    ],
                )->id;
            } else {
                $recipientId = Recipient::create([
                    'name' => $data['recipient_name'],
                    'position' => $data['recipient_position'] ?? null,
                    'company' => $data['recipient_company'] ?? null,
                ])->id;
            }

            if (! empty($data['address_id'])) {
                $recipientAddressId = $data['address_id'];
            } elseif (! empty($data['address']) && ! empty($data['client_id'])) {
                // A new address typed for this transaction is saved back to
                // the client's address book, not just this one transaction.
                $recipientAddressId = ClientAddress::create([
                    'client_id' => $data['client_id'],
                    ...$data['address'],
                ])->id;
            } else {
                $recipientAddressId = null;
            }

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

            // No approval flow configured (or the tenant skips approval
            // entirely): first step, if any, otherwise straight to approved.
            $firstStep = $tenant->requires_approval
                ? ApprovalStep::where('tenant_id', $tenant->id)->orderBy('sequence')->first()
                : null;

            $transaction = Transaction::create([
                'trx_number' => $this->generateTrxNumber($tenant->id),
                'client_id' => $data['client_id'] ?? null,
                'recipient_address_id' => $recipientAddressId,
                'sender_id' => $senderId,
                'recipient_id' => $recipientId,
                'status' => 'pending',
                'current_approval_step_id' => $firstStep?->id,
                'total' => $total,
                'invoice_number' => $data['no_invoice'] ?? false ? null : $data['invoice_number'],
                'no_invoice' => $data['no_invoice'] ?? false,
            ]);

            $transaction->items()->createMany($items);

            if (! $tenant->requires_approval) {
                $this->finalizeApproval($transaction, null);
            }

            return $transaction;
        });

        return response()->json([
            'success' => true,
            'data' => new TransactionResource($transaction->load(self::WITH_RELATIONS)),
            'message' => $transaction->status === 'approved'
                ? 'Transaksi berhasil dibuat dan langsung disetujui (tenant ini tidak memakai approval).'
                : 'Transaksi berhasil dibuat dan menunggu approval.',
        ], 201);
    }

    public function show(Transaction $transaction)
    {
        return response()->json([
            'success' => true,
            'data' => new TransactionResource($transaction->load(self::WITH_RELATIONS)),
            'message' => null,
        ]);
    }

    public function approve(Request $request, Transaction $transaction)
    {
        abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi berstatus pending yang bisa di-approve.');

        $currentStep = $transaction->currentApprovalStep;
        if ($currentStep) {
            abort_unless($request->user()->role === $currentStep->role, 403, "Transaksi ini menunggu approval dari role \"{$currentStep->role}\".");
        }

        DB::transaction(function () use ($request, $transaction, $currentStep) {
            TransactionApproval::create([
                'transaction_id' => $transaction->id,
                'approval_step_id' => $currentStep?->id,
                'approver_id' => $request->user()->id,
                'decision' => 'approved',
            ]);

            $nextStep = $currentStep
                ? ApprovalStep::where('tenant_id', $transaction->tenant_id)
                    ->where('sequence', '>', $currentStep->sequence)
                    ->orderBy('sequence')
                    ->first()
                : null;

            if ($nextStep) {
                $transaction->update(['current_approval_step_id' => $nextStep->id]);
            } else {
                $this->finalizeApproval($transaction, $request->user()->id);
            }
        });

        $fresh = $transaction->fresh(self::WITH_RELATIONS);

        return response()->json([
            'success' => true,
            'data' => [
                'transaction' => new TransactionResource($fresh),
                'invoice' => $fresh->invoice,
            ],
            'message' => $fresh->status === 'approved'
                ? 'Transaksi berhasil di-approve, invoice dibuat.'
                : "Approval tahap \"{$currentStep?->role}\" berhasil dicatat, menunggu tahap berikutnya.",
        ]);
    }

    public function reject(Request $request, Transaction $transaction)
    {
        abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi berstatus pending yang bisa di-reject.');

        $currentStep = $transaction->currentApprovalStep;
        if ($currentStep) {
            abort_unless($request->user()->role === $currentStep->role, 403, "Transaksi ini menunggu approval dari role \"{$currentStep->role}\".");
        }

        $data = $request->validate([
            'rejection_note' => ['required', 'string', 'max:500'],
        ]);

        DB::transaction(function () use ($request, $transaction, $currentStep, $data) {
            TransactionApproval::create([
                'transaction_id' => $transaction->id,
                'approval_step_id' => $currentStep?->id,
                'approver_id' => $request->user()->id,
                'decision' => 'rejected',
                'note' => $data['rejection_note'],
            ]);

            $transaction->update([
                'status' => 'rejected',
                'rejection_note' => $data['rejection_note'],
                'current_approval_step_id' => null,
            ]);
        });

        return response()->json([
            'success' => true,
            'data' => new TransactionResource($transaction->fresh(self::WITH_RELATIONS)),
            'message' => 'Transaksi ditolak.',
        ]);
    }

    public function destroy(Transaction $transaction)
    {
        abort_unless($transaction->status === 'pending', 422, 'Hanya transaksi berstatus pending yang bisa dibatalkan.');

        $transaction->update(['status' => 'cancelled', 'current_approval_step_id' => null]);

        return response()->json([
            'success' => true,
            'data' => null,
            'message' => 'Transaksi dibatalkan.',
        ]);
    }

    /**
     * Common end-of-chain effect, whether reached via the last approval
     * step, a single legacy approve, or an auto-approve (no flow at all):
     * deduct stock and issue the invoice.
     */
    private function finalizeApproval(Transaction $transaction, ?int $approverId): void
    {
        $transaction->load('items.product');

        foreach ($transaction->items as $item) {
            $item->product()->decrement('stock_qty', $item->qty);
        }

        $transaction->update([
            'status' => 'approved',
            'approved_by' => $approverId,
            'approved_at' => now(),
            'current_approval_step_id' => null,
        ]);

        if (! $transaction->no_invoice) {
            Invoice::create([
                'transaction_id' => $transaction->id,
                'invoice_number' => $transaction->invoice_number
                    ?: 'INV-'.now()->format('Y').'-'.str_pad((string) $transaction->id, 4, '0', STR_PAD_LEFT),
            ]);
        }
    }

    /**
     * Per-tenant sequential counter (TRX-0001, TRX-0002, ...) — lets the
     * "Transaksi Barang Keluar" page show the next number before the
     * transaction is even submitted, via nextTrxNumber() below.
     */
    private function generateTrxNumber(int $tenantId): string
    {
        $count = Transaction::withoutGlobalScopes()->where('tenant_id', $tenantId)->count();

        do {
            $count++;
            $candidate = 'TRX-'.str_pad((string) $count, 4, '0', STR_PAD_LEFT);
        } while (Transaction::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('trx_number', $candidate)->exists());

        return $candidate;
    }

    public function nextTrxNumber(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => ['trx_number' => $this->generateTrxNumber($request->user()->tenant_id)],
            'message' => null,
        ]);
    }
}
