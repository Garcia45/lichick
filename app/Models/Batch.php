<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $batch_code
 * @property string $name
 * @property \Illuminate\Support\Carbon $batch_date
 * @property string $pickup_time_slot
 * @property string $status
 * @property-read \Illuminate\Database\Eloquent\Collection<int, BatchProductQuota> $productQuotas
 * @mixin \Illuminate\Database\Eloquent\Builder
 */
class Batch extends Model
{
    use HasFactory;

    protected $fillable = [
        'batch_code',
        'name',
        'batch_date',
        'pickup_time_slot',
        'open_at',
        'close_at',
        'status',
    ];

    protected $casts = [
        'batch_date' => 'date',
        'open_at' => 'datetime',
        'close_at' => 'datetime',
    ];

    public function productQuotas(): HasMany
    {
        return $this->hasMany(BatchProductQuota::class);
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'batch_product_quotas')
            ->withPivot(['id', 'initial_quota', 'sold_qty'])
            ->withTimestamps();
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Hitung sisa kuota untuk produk tertentu pada batch ini
     */
    public function remainingQuotaFor(int $productId): int
    {
        $quota = $this->productQuotas->firstWhere('product_id', $productId);
        if (!$quota) {
            return 0;
        }
        return max(0, $quota->initial_quota - $quota->sold_qty);
    }
}
