<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $order_number
 * @property int $batch_id
 * @property int|null $user_id
 * @property string $customer_name
 * @property string $customer_whatsapp
 * @property string $delivery_method
 * @property string $pickup_time_slot
 * @property string|null $delivery_address
 * @property string|null $notes
 * @property int $total_portions
 * @property int $total_amount
 * @property string|null $payment_proof_path
 * @property string $payment_status
 * @property string $order_status
 * @property-read string $formatted_total
 * @property-read string $status_label
 * @property-read \Illuminate\Database\Eloquent\Collection<int, OrderDetail> $details
 * @property-read Batch|null $batch
 * @mixin \Illuminate\Database\Eloquent\Builder
 */
class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'batch_id',
        'user_id',
        'customer_name',
        'customer_whatsapp',
        'delivery_method',
        'pickup_time_slot',
        'delivery_address',
        'notes',
        'total_portions',
        'total_amount',
        'payment_proof_path',
        'payment_status',
        'order_status',
        'verified_at',
        'verified_by',
    ];

    protected $casts = [
        'total_portions' => 'integer',
        'total_amount' => 'integer',
        'verified_at' => 'datetime',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function details(): HasMany
    {
        return $this->hasMany(OrderDetail::class);
    }

    public function getFormattedTotalAttribute(): string
    {
        return 'Rp' . number_format($this->total_amount, 0, ',', '.');
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->order_status) {
            'waiting_payment' => 'Menunggu Verifikasi Pembayaran',
            'processing'      => 'Diproses Dapur',
            'ready_pickup'    => 'Siap Diambil / Dikirim',
            'completed'       => 'Selesai',
            'cancelled'       => 'Dibatalkan',
            default           => 'Menunggu',
        };
    }
}
