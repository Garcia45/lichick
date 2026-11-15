@extends('layouts.app')

@section('title', 'Kitchen Display & Dashboard — LiChick by LUCUIH')

@section('content')
<div class="space-y-8">

    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-border shadow-card">
        <div>
            <div class="flex items-center gap-2">
                <span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange">Kitchen Operating System</span>
            </div>
            <h1 class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark mt-0.5">Dapur LiChick & Kuota Batch</h1>
        </div>

        <form method="GET" action="{{ route('admin.dashboard') }}" class="flex items-center gap-2">
            <input type="date" name="date" value="{{ $today }}"
                   class="h-11 px-3.5 rounded-2xl border border-zinc-300 text-xs font-bold bg-brand-paper">
            <button type="submit" class="h-11 px-5 rounded-2xl bg-brand-dark hover:bg-black text-white text-xs font-bold transition-all cursor-pointer">
                Filter
            </button>
        </form>
    </div>

    <!-- 1. CULINARY RECAP CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-6 rounded-3xl border border-brand-border shadow-card space-y-1">
            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Omset Terverifikasi (Lunas)</span>
            <div class="font-heading font-extrabold text-3xl text-emerald-600">
                Rp{{ number_format($dailySummary->verified_revenue ?? 0, 0, ',', '.') }}
            </div>
            <span class="text-[11px] font-semibold text-zinc-400 block pt-1">
                Gross: Rp{{ number_format($dailySummary->gross_revenue ?? 0, 0, ',', '.') }}
            </span>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-brand-border shadow-card space-y-1">
            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Box Gemoy Terjual</span>
            <div class="font-heading font-extrabold text-3xl text-brand-orange">
                {{ $dailySummary->total_portions_sold ?? 0 }} <span class="text-base font-normal text-zinc-400">Porsi</span>
            </div>
            <span class="text-[11px] font-semibold text-zinc-400 block pt-1">
                Akumulasi Mac Gemoy & Fries Gemoy
            </span>
        </div>

        <div class="bg-white p-6 rounded-3xl border border-brand-border shadow-card space-y-1">
            <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Tiket Pesanan Masuk</span>
            <div class="font-heading font-extrabold text-3xl text-brand-dark">
                {{ $dailySummary->total_orders ?? 0 }} <span class="text-base font-normal text-zinc-400">Tiket</span>
            </div>
            <span class="text-[11px] font-semibold text-zinc-400 block pt-1">
                Tanggal: {{ $today }}
            </span>
        </div>
    </div>

    <!-- 2. BATCH QUOTA KITCHEN LIMIT CONTROL -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-card space-y-5">
        <div>
            <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange">Capacity Control</span>
            <h2 class="font-heading font-bold text-xl text-brand-dark">Kontrol Kuota Batch Dapur (25 Porsi per Menu)</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @foreach($batches as $batch)
                <div class="p-5 rounded-2xl bg-brand-paper border border-brand-border space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="font-heading font-bold text-lg text-brand-dark">{{ $batch->name }}</h3>
                            <span class="text-xs font-semibold text-brand-orange">Slot: {{ $batch->pickup_time_slot }}</span>
                        </div>
                        <span class="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                            {{ $batch->status }}
                        </span>
                    </div>

                    <div class="space-y-3 pt-3 border-t border-zinc-200">
                        @foreach($batch->productQuotas as $quota)
                            <form action="{{ route('admin.quotas.update', $quota) }}" method="POST" class="flex items-center justify-between gap-3 text-xs">
                                @csrf
                                @method('PATCH')
                                <div>
                                    <strong class="text-brand-dark text-sm">{{ $quota->product->name }}</strong>
                                    <div class="text-[11px] font-semibold text-zinc-500">
                                        Terjual: <span class="text-brand-orange font-bold">{{ $quota->sold_qty }}</span> | Sisa: <span class="text-emerald-600 font-bold">{{ $quota->remaining_quota }}</span>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <input type="number" name="initial_quota" value="{{ $quota->initial_quota }}" min="{{ $quota->sold_qty }}"
                                           class="w-16 h-9 px-2 rounded-xl border border-zinc-300 text-center font-bold text-sm bg-white">
                                    <button type="submit" class="h-9 px-3.5 rounded-xl bg-brand-dark hover:bg-black text-white font-bold transition-all cursor-pointer">
                                        Simpan
                                    </button>
                                </div>
                            </form>
                        @endforeach
                    </div>
                </div>
            @endforeach
        </div>
    </div>

    <!-- 3. ORDERS QUEUE & 1-CLICK VERIFICATION TABLE -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-card space-y-4">
        <div>
            <span class="text-xs font-extrabold uppercase tracking-widest text-brand-orange">Queue & Payment</span>
            <h2 class="font-heading font-bold text-xl text-brand-dark">Antrean Pesanan & Approval Bukti Transfer</h2>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                    <tr class="border-b border-brand-border text-zinc-400 uppercase text-[11px] font-bold">
                        <th class="py-3 px-3">Tiket & Waktu</th>
                        <th class="py-3 px-3">Pelanggan</th>
                        <th class="py-3 px-3">Menu Pesanan</th>
                        <th class="py-3 px-3">Nominal & Bukti</th>
                        <th class="py-3 px-3">Status Dapur & Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-brand-border/60">
                    @forelse($orders as $order)
                        <tr class="hover:bg-brand-paper/50 transition-colors">
                            <td class="py-4 px-3 font-mono font-extrabold text-brand-dark">
                                {{ $order->order_number }}
                                <span class="block font-sans font-semibold text-[11px] text-brand-orange mt-0.5">{{ $order->pickup_time_slot }}</span>
                            </td>
                            <td class="py-4 px-3">
                                <div class="font-bold text-brand-dark">{{ $order->customer_name }}</div>
                                <div class="text-xs text-zinc-500 font-medium">{{ $order->customer_whatsapp }} • <span class="uppercase font-bold">{{ $order->delivery_method }}</span></div>
                            </td>
                            <td class="py-4 px-3">
                                @foreach($order->details as $detail)
                                    <div class="text-zinc-700">{{ $detail->product_name_snapshot }} <strong class="text-brand-dark">x{{ $detail->quantity }}</strong></div>
                                @endforeach
                            </td>
                            <td class="py-4 px-3">
                                <div class="font-heading font-extrabold text-brand-orange text-base">{{ $order->formatted_total }}</div>
                                @if($order->payment_proof_path)
                                    <a href="{{ asset('storage/' . $order->payment_proof_path) }}" target="_blank"
                                       class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 underline mt-1">
                                        <span>Buka Foto TF</span>
                                        <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                    </a>
                                @endif
                            </td>
                            <td class="py-4 px-3">
                                <div class="flex flex-wrap items-center gap-2">
                                    @if($order->payment_status !== 'paid')
                                        <form action="{{ route('admin.orders.verify', $order) }}" method="POST">
                                            @csrf
                                            @method('PATCH')
                                            <button type="submit"
                                                    class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer">
                                                Approve TF
                                            </button>
                                        </form>
                                    @endif

                                    <form action="{{ route('admin.orders.status', $order) }}" method="POST">
                                        @csrf
                                        @method('PATCH')
                                        <select name="order_status" onchange="this.form.submit()"
                                                class="h-9 px-3 rounded-xl border border-zinc-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange">
                                            <option value="waiting_payment" @selected($order->order_status === 'waiting_payment')>Menunggu Pembayaran</option>
                                            <option value="processing" @selected($order->order_status === 'processing')>Diproses Dapur</option>
                                            <option value="ready_pickup" @selected($order->order_status === 'ready_pickup')>Siap Diambil</option>
                                            <option value="completed" @selected($order->order_status === 'completed')>Selesai</option>
                                            <option value="cancelled" @selected($order->order_status === 'cancelled')>Batalkan</option>
                                        </select>
                                    </form>
                                </div>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="py-8 text-center text-zinc-400 font-medium">Belum ada pesanan masuk pada tanggal ini.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

</div>
@endsection
