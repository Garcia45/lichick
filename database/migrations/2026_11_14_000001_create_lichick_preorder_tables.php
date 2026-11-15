<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tabel Users (Admin & Staff Dapur)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone', 20)->nullable();
            $table->enum('role', ['admin', 'kitchen', 'customer'])->default('customer');
            $table->string('password');
            $table->rememberToken();
            $table->timestamps();
        });

        // 2. Tabel Products (Mac Gemoy & Fries Gemoy)
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Contoh: "Mac Gemoy", "Fries Gemoy"
            $table->string('slug')->unique();
            $table->text('description');
            $table->string('ingredients_badge')->nullable(); // Contoh: "Makaroni • Ayam Crispy • Saus Keju"
            $table->unsignedInteger('price')->default(18000); // Dalam Rupiah (Rp18.000)
            $table->string('image_url')->nullable();
            $table->unsignedInteger('default_batch_quota')->default(25); // Default 25 porsi per batch
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. Tabel Batches (Batch Harian & Slot Waktu Pengambilan/Pengiriman)
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_code')->unique(); // Contoh: "BATCH-20261114-1"
            $table->string('name'); // Contoh: "Batch Siang (Lunch Drop)"
            $table->date('batch_date');
            $table->string('pickup_time_slot'); // Contoh: "11:30 - 13:00 WIB"
            $table->timestamp('open_at')->nullable();
            $table->timestamp('close_at')->nullable();
            $table->enum('status', ['open', 'closed', 'processing', 'completed'])->default('open');
            $table->timestamps();

            $table->index(['batch_date', 'status']);
        });

        // 4. Tabel Pivot Kuota Produk per Batch (25 Porsi Mac & 25 Porsi Fries per Batch)
        Schema::create('batch_product_quotas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('batches')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedInteger('initial_quota')->default(25); // Kuota awal: 25 porsi
            $table->unsignedInteger('sold_qty')->default(0);       // Terjual saat ini
            $table->timestamps();

            $table->unique(['batch_id', 'product_id']);
        });

        // 5. Tabel Orders (Data Pemesanan Pelanggan)
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 32)->unique(); // Contoh: "LCK-261114-8921"
            $table->foreignId('batch_id')->constrained('batches')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('customer_name');
            $table->string('customer_whatsapp', 25);
            $table->enum('delivery_method', ['pickup', 'delivery'])->default('pickup');
            $table->string('pickup_time_slot'); // Slot waktu spesifik yang dipilih pelanggan
            $table->text('delivery_address')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedInteger('total_portions')->default(0);
            $table->unsignedInteger('total_amount'); // Total harga dalam Rupiah
            $table->string('payment_proof_path')->nullable(); // Path bukti transfer
            $table->enum('payment_status', ['unpaid', 'pending_verification', 'paid', 'rejected'])
                  ->default('pending_verification');
            $table->enum('order_status', [
                'waiting_payment', // Menunggu Pembayaran / Verifikasi
                'processing',      // Diproses Dapur
                'ready_pickup',    // Siap Diambil / Dikirim
                'completed',       // Selesai
                'cancelled'        // Dibatalkan (kuota dikembalikan)
            ])->default('waiting_payment');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['order_number', 'customer_whatsapp']);
            $table->index(['batch_id', 'order_status', 'payment_status']);
        });

        // 6. Tabel Order Details (Rincian Item per Pesanan)
        Schema::create('order_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete();
            $table->string('product_name_snapshot'); // Snapshot nama produk saat transaksi
            $table->unsignedInteger('unit_price');   // Snapshot harga (Rp18.000)
            $table->unsignedInteger('quantity');     // Jumlah porsi
            $table->unsignedInteger('subtotal');     // unit_price * quantity
            $table->string('item_notes')->nullable(); // Contoh: "Saus keju dipisah / pedas"
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_details');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('batch_product_quotas');
        Schema::dropIfExists('batches');
        Schema::dropIfExists('products');
        Schema::dropIfExists('users');
    }
};

