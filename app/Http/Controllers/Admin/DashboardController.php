<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\BatchProductQuota;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

class DashboardController extends Controller
{
    /**
     * Tampilkan Dashboard Admin: Rekap Harian, Kuota Batch (25 Mac & 25 Fries), dan Antrean Verifikasi
     */
    public function index(Request $request): View
    {
        $today = $request->query('date', now()->toDateString());

        // Rekap Penjualan Harian (Hanya order yang tidak dibatalkan)
        $dailySummary = Order::whereDate('created_at', $today)
            ->where('order_status', '!=', 'cancelled')
            ->selectRaw('
                COUNT(*) as total_orders,
                COALESCE(SUM(CASE WHEN payment_status = "paid" THEN total_amount ELSE 0 END), 0) as verified_revenue,
                COALESCE(SUM(total_amount), 0) as gross_revenue,
                COALESCE(SUM(total_portions), 0) as total_portions_sold
            ')
            ->first();

        $batches = Batch::with(['productQuotas.product'])
            ->whereDate('batch_date', $today)
            ->get();

        $orders = Order::with(['batch', 'details'])
            ->whereDate('created_at', $today)
            ->latest()
            ->paginate(15);

        return view('admin.dashboard', compact('today', 'dailySummary', 'batches', 'orders'));
    }

    /**
     * Tombol Cepat: Verifikasi Bukti Transfer & Teruskan ke Dapur
     */
    public function verifyPayment(Order $order): RedirectResponse
    {
        $order->update([
            'payment_status' => 'paid',
            'order_status'   => 'processing', // Otomatis masuk "Diproses Dapur"
            'verified_at'    => now(),
            'verified_by'    => Auth::id(),
        ]);

        return back()->with('success', "Pembayaran #{$order->order_number} disetujui & masuk antrean Dapur!");
    }

    /**
     * Update Status Dapur (Diproses Dapur -> Siap Diambil -> Selesai)
     */
    public function updateOrderStatus(Request $request, Order $order): RedirectResponse
    {
        $validated = $request->validate([
            'order_status' => ['required', 'in:waiting_payment,processing,ready_pickup,completed,cancelled'],
        ]);

        DB::transaction(function () use ($order, $validated) {
            // Jika dibatalkan, kembalikan kuota porsi ke batch
            if ($validated['order_status'] === 'cancelled' && $order->order_status !== 'cancelled') {
                foreach ($order->details as $detail) {
                    BatchProductQuota::where('batch_id', $order->batch_id)
                        ->where('product_id', $detail->product_id)
                        ->decrement('sold_qty', $detail->quantity);
                }
            }

            $order->update(['order_status' => $validated['order_status']]);
        });

        return back()->with('success', "Status pesanan #{$order->order_number} diperbarui menjadi {$order->status_label}.");
    }

    /**
     * Update Kuota Produk pada Batch (Default 25 Mac Gemoy & 25 Fries Gemoy)
     */
    public function updateBatchQuota(Request $request, BatchProductQuota $quota): RedirectResponse
    {
        $validated = $request->validate([
            'initial_quota' => ['required', 'integer', 'min:' . $quota->sold_qty, 'max:200'],
        ]);

        $quota->update(['initial_quota' => $validated['initial_quota']]);

        return back()->with('success', 'Kuota batch berhasil diperbarui.');
    }
}
