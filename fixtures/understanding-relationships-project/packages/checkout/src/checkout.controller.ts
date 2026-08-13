import { PaymentService } from "../../payments/src/payment.service.js";

export class CheckoutController {
  constructor(private readonly paymentService: PaymentService) {}

  checkout(amount: number): number {
    return this.paymentService.charge(amount);
  }
}
