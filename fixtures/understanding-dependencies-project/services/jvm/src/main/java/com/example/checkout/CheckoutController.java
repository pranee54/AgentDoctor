package com.example.checkout;

import com.example.payments.PaymentService;

public class CheckoutController {
  public void run() {
    new PaymentService().charge();
  }
}
