<?php
namespace App\Http\Controllers;
use App\Services\PaymentService;
class CheckoutController {
  public function __construct(private PaymentService $payments) {}
  public function show() {}
}
