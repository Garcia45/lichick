@extends('layouts.app')

@section('title', 'Lacak Status Pesanan — LiChick by LUCUIH')

@section('content')
<div class="max-w-2xl mx-auto space-y-6 sm:space-y-8">

    <!-- Search Card -->
    <div class="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-card">
        <div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-brand-orange mb-1">
            <span class="size-2 rounded-full bg-brand-orange animate-pulse"></span>
            <span>Live Kitchen Tracker</span>
        </div>
        <h1 class="font-heading font-extrabold text-2xl sm:text-3xl text-brand-dark">Cek Status Pesanan LiChick</h1>
        <p class="text-xs sm:text-sm text-zinc-500 mt-1">Pantau proses masak ayam crispy & saus keju kamu dari dapur sampai siap diambil.</p>

        <form action="{{ route('preorder.track') }}" method="GET" class="mt-5 flex gap-2">
            <input type="text"
                   name="order_number"
                   value="{{ $queryNumber }}"
                   placeholder="Contoh: LCK-261114-XXXX"
                   required
                   class="flex-1 h-12 px-4 rounded-2xl border border-zinc-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-brand-orange">
            <button type="submit"
                    class="px-6 h-12 rounded-2xl bg-brand-orange hover:bg-brand-orange-hover text-white font-heading font-bold text-sm shadow-brand transition-all cursor-pointer">
                Lacak
            </button>
        </form>
    </div>

    @if($order)
        @php
            $steps = [
                'waiting_payment' => [
                    'label' => 'Verifikasi Pembayaran',
                    'desc'  => 'Admin sedang mencocokkan bukti transfer rekeningmu.',
                    'icon'  => 'receipt'
                ],
                'processing' => [
                    'label' => 'Sedang Dimasak Dapur',
                    'desc'  => 'Ayam crispy baru digoreng & saus keju lumer disiapkan hangat.',
                    'icon'  => 'flame'
                ],
                'ready_pickup' => [
                    'label' => 'Siap Diambil / Diantar',
                    'desc'  => 'Pesanan sudah masuk box rapi dan siap di booth / dibawa kurir.',
                    'icon'  => 'box'
                ],
                'completed' => [
                    'label' => 'Pesanan Selesai',
                    'desc'  => 'Selamat menikmati Mac Gemoy & Fries Gemoy!',
                    'icon'  => 'check'
                ],
            ];
            $stepKeys = array_keys($steps);
            $currentIndex = array_search($order->order_status, $stepKeys);
            if ($currentIndex === false) $currentIndex = -1;
        @endphp

        <!-- Order Detail & Timeline -->
        <div class="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-card space-y-6">
            <!-- Order Header -->
            <div class="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-brand-border">
                <div>
                    <span class="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">Nomor Tiket Pesanan</span>
                    <h2 class="font-mono font-extrabold text-2xl text-brand-dark">{{ $order->order_number }}</h2>
                </div>
                <div class="px-4 py-2 rounded-2xl bg-amber-100 text-amber-950 font-heading font-bold text-xs uppercase tracking-wide border border-amber-300/80">
                    {{ $order->status_label }}
                </div>
            </div>

            <!-- Visual Vertical Timeline -->
            <div class="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-200">
                @foreach($steps as $key => $info)
                    @php
                        $idx = array_search($key, $stepKeys);
                        $isPassed = $currentIndex >= $idx;
                        $isCurrent = $currentIndex === $idx;
                    @endphp
                    <div class="relative flex items-start gap-4">
                        <!-- Node Icon -->
                        <div class="absolute -left-6 sm:-left-8 size-7 sm:size-8 rounded-full flex items-center justify-center font-heading font-bold text-xs transition-colors {{ $isPassed ? 'bg-brand-orange text-white shadow-brand' : 'bg-zinc-200 text-zinc-500' }}">
                            @if($isPassed)
                                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                            @else
                                {{ $idx + 1 }}
                            @endif
                        </div>

                        <div class="pl-2">
                            <div class="flex items-center gap-2">
                                <h3 class="font-heading font-bold text-base {{ $isPassed ? 'text-brand-dark' : 'text-zinc-400' }}">
                                    {{ $info['label'] }}
                                </h3>
                                @if($isCurrent)
                                    <span class="px-2 py-0.5 rounded-full bg-brand-orange text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                        Proses Saat Ini
                                    </span>
                                @endif
                            </div>
                            <p class="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">{{ $info['desc'] }}</p>
                        </div>
                    </div>
                @endforeach
            </div>

            <!-- Receipt Breakdown -->
            <div class="bg-brand-paper rounded-2xl p-5 border border-brand-border space-y-3 text-xs sm:text-sm">
                <div class="flex justify-between items-center text-zinc-600">
                    <span>Pemesan:</span>
                    <strong class="text-brand-dark">{{ $order->customer_name }} ({{ $order->customer_whatsapp }})</strong>
                </div>
                <div class="flex justify-between items-center text-zinc-600">
                    <span>Slot Pengambilan:</span>
                    <strong class="text-brand-orange">{{ $order->batch?->name }} • {{ $order->pickup_time_slot }}</strong>
                </div>
                <div class="flex justify-between items-center text-zinc-600">
                    <span>Metode:</span>
                    <strong class="text-brand-dark uppercase">{{ $order->delivery_method }}</strong>
                </div>
                @if($order->delivery_address)
                    <div class="flex justify-between items-start text-zinc-600 pt-1">
                        <span class="shrink-0">Alamat Kirim:</span>
                        <span class="text-right text-brand-dark font-medium max-w-[280px]">{{ $order->delivery_address }}</span>
                    </div>
                @endif

                <div class="pt-3 border-t border-zinc-200 space-y-1.5">
                    @foreach($order->details as $detail)
                        <div class="flex justify-between items-center">
                            <span class="text-zinc-700">{{ $detail->product_name_snapshot }} <strong>x{{ $detail->quantity }}</strong></span>
                            <span class="font-heading font-bold text-brand-dark">Rp{{ number_format($detail->subtotal, 0, ',', '.') }}</span>
                        </div>
                    @endforeach
                </div>

                <div class="pt-3 border-t border-zinc-200 flex justify-between items-center text-base font-heading font-extrabold text-brand-dark">
                    <span>Total Pembayaran</span>
                    <span class="text-brand-orange text-xl">{{ $order->formatted_total }}</span>
                </div>
            </div>
        </div>
    @elseif($queryNumber)
        <div class="bg-white rounded-3xl p-8 border border-zinc-200 text-center space-y-2">
            <div class="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 class="font-heading font-bold text-lg text-brand-dark">Kode Pesanan Tidak Ditemukan</h3>
            <p class="text-xs text-zinc-500">Nomor "{{ $queryNumber }}" belum terdaftar. Pastikan tidak ada salah ketik.</p>
        </div>
    @endif

</div>
@endsection
