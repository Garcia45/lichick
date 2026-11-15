<?php

namespace Database\Seeders;

use App\Models\Batch;
use App\Models\BatchProductQuota;
use App\Models\Product;
use Illuminate\Database\Seeder;

class LichickSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed 2 Menu Utama LiChick by LUCUIH
        $macGemoy = Product::updateOrCreate(
            ['slug' => 'mac-gemoy'],
            [
                'name' => 'Mac Gemoy',
                'description' => 'Paduan makaroni lembut premium dengan potongan ayam crispy renyah di luar juicy di dalam, disiram saus keju spesial LiChick yang lumer dan gurih melimpah.',
                'ingredients_badge' => 'Makaroni • Ayam Crispy • Saus Keju Lumer',
                'price' => 18000,
                'default_batch_quota' => 25,
                'is_active' => true,
            ]
        );

        $friesGemoy = Product::updateOrCreate(
            ['slug' => 'fries-gemoy'],
            [
                'name' => 'Fries Gemoy',
                'description' => 'Kentang goreng golden-crispy berpadu dengan potongan ayam crispy hangat, taburan bumbu rahasia LUCUIH FOOD, dan cocolan saus keju/pedas favorit.',
                'ingredients_badge' => 'Kentang Goreng • Ayam Crispy • Bumbu Tabur • Saus',
                'price' => 18000,
                'default_batch_quota' => 25,
                'is_active' => true,
            ]
        );

        // 2. Seed Batch Harian (Batch Siang & Batch Sore) dengan masing-masing 25 Kuota
        $batches = [
            [
                'batch_code' => 'BATCH-' . now()->format('Ymd') . '-01',
                'name' => 'Batch 1 — Makan Siang Kampus',
                'batch_date' => now()->toDateString(),
                'pickup_time_slot' => '11:30 - 13:00 WIB',
                'status' => 'open',
            ],
            [
                'batch_code' => 'BATCH-' . now()->format('Ymd') . '-02',
                'name' => 'Batch 2 — Sore Nongkrong',
                'batch_date' => now()->toDateString(),
                'pickup_time_slot' => '15:30 - 17:00 WIB',
                'status' => 'open',
            ],
        ];

        foreach ($batches as $batchData) {
            $batch = Batch::updateOrCreate(
                ['batch_code' => $batchData['batch_code']],
                $batchData
            );

            // Set kuota 25 porsi Mac Gemoy & 25 porsi Fries Gemoy per batch
            foreach ([$macGemoy, $friesGemoy] as $product) {
                BatchProductQuota::firstOrCreate(
                    [
                        'batch_id' => $batch->id,
                        'product_id' => $product->id,
                    ],
                    [
                        'initial_quota' => 25,
                        'sold_qty' => 0,
                    ]
                );
            }
        }
    }
}

