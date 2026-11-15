<!DOCTYPE html>
<html lang="id" class="scroll-smooth antialiased">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
    <title>@yield('title', 'LiChick by LUCUIH — Pre-Order Mac Gemoy & Fries Gemoy')</title>

    <!-- Google Fonts: Poppins (Heading & Body) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet">

    <!-- Tailwind CSS CDN & Design System Tokens (Warm Street-Food / Hype Culinary) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        heading: ['"Poppins"', 'sans-serif'],
                        sans: ['"Poppins"', 'sans-serif'],
                    },
                    colors: {
                        brand: {
                            orange: '#FF5500',       // Bold Crispy Chicken Orange
                            'orange-hover': '#E04800',
                            amber: '#FFB800',        // Melted Cheddar Gold
                            creamy: '#FFFDF9',       // Clean Culinary Cream
                            paper: '#F8F6F0',        // Warm Kraft Paper Base
                            dark: '#141416',         // Modern Deep Charcoal
                            charcoal: '#222227',
                            border: '#EBE7DF',
                        }
                    },
                    boxShadow: {
                        'brand': '0 10px 25px -5px rgba(255, 85, 0, 0.25)',
                        'card': '0 2px 12px rgba(20, 20, 22, 0.04), 0 1px 2px rgba(20, 20, 22, 0.02)',
                        'card-hover': '0 20px 35px -10px rgba(20, 20, 22, 0.08), 0 1px 3px rgba(20, 20, 22, 0.04)',
                        'floating': '0 20px 40px -15px rgba(20, 20, 22, 0.3)',
                    }
                }
            }
        }
    </script>

    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

    <style>
        [x-cloak] { display: none !important; }
        body, button, input, select, textarea { font-family: 'Poppins', sans-serif; }
        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #F8F6F0; }
        ::-webkit-scrollbar-thumb { background: #D9D4C7; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #FF5500; }
    </style>
</head>
<body class="bg-brand-paper text-brand-dark font-sans selection:bg-brand-orange selection:text-white pb-32 sm:pb-20">

    <!-- Top Urgent Notice Ticker (Food Pre-Order Announcement) -->
    <div class="bg-brand-dark text-white py-2 px-4 border-b border-brand-charcoal text-[11px] sm:text-xs font-semibold tracking-wide">
        <div class="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div class="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                <span class="inline-flex size-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span class="text-brand-amber font-heading font-bold uppercase tracking-wider">BATCH PO AKTIF</span>
                <span class="text-zinc-300 truncate">Slot Batch Terbatas: Maksimal 25 Porsi per Menu • Fresh dimasak tiap jam slot!</span>
            </div>
            <a href="{{ route('preorder.track') }}" class="shrink-0 text-white hover:text-brand-amber underline decoration-zinc-600 transition-colors hidden sm:inline-block">
                Cek Pesanan Saya →
            </a>
        </div>
    </div>

    <!-- Main Navigation Bar -->
    <header class="sticky top-0 z-40 bg-brand-creamy/95 backdrop-blur-md border-b border-brand-border">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
            <!-- Brand Identity -->
            <a href="{{ route('preorder.index') }}" class="flex items-center gap-3 group">
                <div class="size-11 sm:size-12 rounded-2xl bg-brand-orange flex items-center justify-center text-white shadow-brand group-hover:scale-105 transition-transform duration-200">
                    <!-- Custom Crispy Chicken & Cheese Flame Mark -->
                    <svg class="size-6 sm:size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11Z"/>
                        <circle cx="12" cy="14" r="2" fill="currentColor"/>
                    </svg>
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-heading font-bold text-xl sm:text-2xl tracking-tight text-brand-dark leading-none">
                            LiChick<span class="text-brand-orange">.</span>
                        </span>
                        <span class="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                            BY LUCUIH
                        </span>
                    </div>
                    <p class="text-[11px] font-medium text-zinc-500 mt-0.5 leading-none">Crispy Chicken & Melted Cheese Box</p>
                </div>
            </a>

            <!-- Quick Navigation Actions -->
            <div class="flex items-center gap-2 sm:gap-3">
                <a href="{{ route('preorder.track') }}"
                   class="inline-flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold text-brand-dark bg-white border border-brand-border hover:border-brand-orange hover:text-brand-orange transition-all duration-150 shadow-sm cursor-pointer min-h-[42px]">
                    <svg class="size-4 text-brand-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>Lacak Pesanan</span>
                </a>
                <a href="{{ route('admin.dashboard') }}"
                   class="inline-flex items-center gap-1 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors duration-150 min-h-[42px]">
                    <span>Dapur</span>
                </a>
            </div>
        </div>
    </header>

    <!-- Main Content Area -->
    <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        @if(session('success'))
            <div class="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 shadow-sm">
                <svg class="size-5 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                <div class="text-sm font-semibold">{{ session('success') }}</div>
            </div>
        @endif

        @if($errors->any())
            <div class="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 shadow-sm">
                <div class="flex items-center gap-2 font-bold text-sm mb-1.5">
                    <svg class="size-5 text-red-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>Mohon cek kembali pesanan Anda:</span>
                </div>
                <ul class="list-disc list-inside text-xs sm:text-sm space-y-1 text-red-700">
                    @foreach($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        @yield('content')
    </main>

</body>
</html>
