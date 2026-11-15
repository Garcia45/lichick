<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $batch_id
 * @property int $product_id
 * @property int $initial_quota
 * @property int $sold_qty
 * @property-read int $remaining_quota
 * @property-read int $percentage_filled
 * @property-read Product $product
 * @property-read Batch $batch
 * @mixin \Illuminate\Database\Eloquent\Builder
 */
class BatchProductQuota extends Model
{
    protected $table = 'batch_product_quotas';

    protected $fillable = [
        'batch_id',
        'product_id',
        'initial_quota',
        'sold_qty',
    ];

    protected $casts = [
        'initial_quota' => 'integer',
        'sold_qty' => 'integer',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function getRemainingQuotaAttribute(): int
    {
        return max(0, $this->initial_quota - $this->sold_qty);
    }

    public function getPercentageFilledAttribute(): int
    {
        if ($this->initial_quota <= 0) {
            return 100;
        }
        return min(100, (int) round(($this->sold_qty / $this->initial_quota) * 100));
    }
}
