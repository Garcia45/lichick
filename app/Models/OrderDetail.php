<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $order_id
 * @property int $product_id
 * @property string $product_name_snapshot
 * @property int $unit_price
 * @property int $quantity
 * @property int $subtotal
 * @property string|null $item_notes
 * @mixin \Illuminate\Database\Eloquent\Builder
 */
class OrderDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'product_id',
        'product_name_snapshot',
        'unit_price',
        'quantity',
        'subtotal',
        'item_notes',
    ];

    protected $casts = [
        'unit_price' => 'integer',
        'quantity' => 'integer',
        'subtotal' => 'integer',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
