<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string $description
 * @property string|null $ingredients_badge
 * @property int $price
 * @property string|null $image_url
 * @property int $default_batch_quota
 * @property bool $is_active
 * @property-read string $formatted_price
 * @mixin \Illuminate\Database\Eloquent\Builder
 */
class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'ingredients_badge',
        'price',
        'image_url',
        'default_batch_quota',
        'is_active',
    ];

    protected $casts = [
        'price' => 'integer',
        'default_batch_quota' => 'integer',
        'is_active' => 'boolean',
    ];

    public function batchQuotas(): HasMany
    {
        return $this->hasMany(BatchProductQuota::class);
    }

    public function batches(): BelongsToMany
    {
        return $this->belongsToMany(Batch::class, 'batch_product_quotas')
            ->withPivot(['initial_quota', 'sold_qty'])
            ->withTimestamps();
    }

    public function orderDetails(): HasMany
    {
        return $this->hasMany(OrderDetail::class);
    }

    public function getFormattedPriceAttribute(): string
    {
        return 'Rp' . number_format($this->price, 0, ',', '.');
    }
}
