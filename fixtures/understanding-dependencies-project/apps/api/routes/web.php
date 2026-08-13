<?php

use App\Http\Controllers\CheckoutController;

Route::get('/checkout', [CheckoutController::class, 'show']);
