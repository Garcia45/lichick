<?php

namespace App\Http\Controllers;

use App\Models\Batch;
use App\Models\BatchProductQuota;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class PreOrderController extends Controller
{
    /**
     * Tampilkan Beranda, Katalog Menu, Pilihan Batch & Keranjang Pre-Order
     */
    public function index(Request $request): View
    {
        $batches = Batch::with(['productQuotas.product'])
            ->whereDate('batch_date', '>=', now()->toDateString())
            ->where('status', 'open')
            ->orderBy('batch_date')
            ->orderBy('id')
            ->get();

        if ($batches->isEmpty()) {
            $batches = Batch::with(['productQuotas.product'])
                ->where('status', 'open')
                ->orderBy('id')
                ->get();
        }

        $selectedBatchId = $request->query('batch_id', $batches->first()?->id);
        $activeBatch = $batches->firstWhere('id', (int) $selectedBatchId) ?? $batches->first();

        $products = Product::where('is_active', true)->get();

        return view('preorder.index', compact('batches', 'activeBatch', 'products'));
    }

    /**
     * Simpan Pesanan Pre-Order dengan Pessimistic Locking (Mencegah Race Condition Kuota 50 Porsi)
     */
    public function checkout(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'batch_id'          => ['required', 'exists:batches,id'],
            'customer_name'     => ['required', 'string', 'max:100'],
            'customer_whatsapp' => ['required', 'string', 'regex:/^[0-9+\-\s]{9,20}$/'],
            'delivery_method'   => ['required', 'in:pickup,delivery'],
            'pickup_time_slot'  => ['required', 'string', 'max:60'],
            'delivery_address'  => ['required_if:delivery_method,delivery', 'nullable', 'string', 'max:350'],
            'notes'             => ['nullable', 'string', 'max:250'],
            'payment_proof'     => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
            'items'             => ['required', 'array', 'min:1'],
            'items.*.product_id'=> ['required', 'exists:products,id'],
            'items.*.quantity'  => ['required', 'integer', 'min:0', 'max:50'],
            'items.*.item_notes'=> ['nullable', 'string', 'max:120'],
        ]);

        // Filter hanya item yang dipesan (quantity > 0)
        $orderedItems = collect($validated['items'])
            ->filter(fn ($item) => (int) $item['quantity'] > 0)
            ->values();

        if ($orderedItems->isEmpty()) {
            throw ValidationException::withMessages([
                'items' => 'Pilih minimal 1 porsi Mac Gemoy atau Fries Gemoy sebelum memesan.',
            ]);
        }

        // Simpan file bukti transfer ke storage/app/public/payment_proofs
        $proofPath = $request->file('payment_proof')->store('payment_proofs', 'public');

        /** @var Order $order */
        $order = DB::transaction(function () use ($validated, $orderedItems, $proofPath) {
            /** @var Batch $batch */
            $batch = Batch::where('id', $validated['batch_id'])
                ->where('status', 'open')
                ->lockForUpdate()
                ->firstOrFail();

            $totalPortions = 0;
            $totalAmount = 0;
            $detailsPayload = [];

            foreach ($orderedItems as $item) {
                $qty = (int) $item['quantity'];

                // Lock baris kuota produk pada batch ini agar tidak over-order melebihi 25 porsi
                /** @var BatchProductQuota $quota */
                $quota = BatchProductQuota::where('batch_id', $batch->id)
                    ->where('product_id', $item['product_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                /** @var Product $product */
                $product = Product::findOrFail($item['product_id']);
                $remaining = $quota->initial_quota - $quota->sold_qty;

                if ($qty > $remaining) {
                    throw ValidationException::withMessages([
                        'items' => "Maaf! Sisa kuota {$product->name} pada {$batch->name} tinggal {$remaining} porsi.",
                    ]);
                }

                // Kurangi kuota (tambah sold_qty)
                $quota->increment('sold_qty', $qty);

                $subtotal = $product->price * $qty;
                $totalPortions += $qty;
                $totalAmount += $subtotal;

                $detailsPayload[] = [
                    'product_id'            => $product->id,
                    'product_name_snapshot' => $product->name,
                    'unit_price'            => $product->price,
                    'quantity'              => $qty,
                    'subtotal'              => $subtotal,
                    'item_notes'            => $item['item_notes'] ?? null,
                ];
            }

            $orderNumber = 'LCK-' . now()->format('ymd') . '-' . strtoupper(Str::random(4));

            /** @var Order $newOrder */
            $newOrder = Order::create([
                'order_number'      => $orderNumber,
                'batch_id'          => $batch->id,
                'customer_name'     => $validated['customer_name'],
                'customer_whatsapp' => $validated['customer_whatsapp'],
                'delivery_method'   => $validated['delivery_method'],
                'pickup_time_slot'  => $validated['pickup_time_slot'],
                'delivery_address'  => $validated['delivery_address'] ?? null,
                'notes'             => $validated['notes'] ?? null,
                'total_portions'    => $totalPortions,
                'total_amount'      => $totalAmount,
                'payment_proof_path'=> $proofPath,
                'payment_status'    => 'pending_verification',
                'order_status'      => 'waiting_payment',
            ]);

            foreach ($detailsPayload as $detail) {
                $newOrder->details()->create($detail);
            }

            return $newOrder;
        });

        return redirect()
            ->route('preorder.track', ['order_number' => $order->order_number])
            ->with('success', 'Pesanan berhasil dibuat! Tim dapur LiChick sedang memverifikasi bukti transfer kamu.');
    }

    /**
     * Halaman Tracking Pesanan Real-Time
     */
    public function track(Request $request, ?string $orderNumber = null): View
    {
        $queryNumber = $orderNumber ?? $request->query('order_number');
        $order = null;

        if ($queryNumber) {
            $order = Order::with(['batch', 'details.product'])
                ->where('order_number', strtoupper(trim($queryNumber)))
                ->first();
        }

        return view('preorder.track', compact('order', 'queryNumber'));
    }
}

