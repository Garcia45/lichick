<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\PreOrderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Customer Pre-Order Routes (LiChick by LUCUIH)
|--------------------------------------------------------------------------
*/
Route::get('/', [PreOrderController::class, 'index'])->name('preorder.index');
Route::post('/checkout', [PreOrderController::class, 'checkout'])->name('preorder.checkout');
Route::get('/track/{order_number?}', [PreOrderController::class, 'track'])->name('preorder.track');

/*
|--------------------------------------------------------------------------
| Admin & Kitchen Dashboard Routes
|--------------------------------------------------------------------------
*/
Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::patch('/orders/{order}/verify-payment', [DashboardController::class, 'verifyPayment'])->name('orders.verify');
    Route::patch('/orders/{order}/status', [DashboardController::class, 'updateOrderStatus'])->name('orders.status');
    Route::patch('/quotas/{quota}', [DashboardController::class, 'updateBatchQuota'])->name('quotas.update');
});

