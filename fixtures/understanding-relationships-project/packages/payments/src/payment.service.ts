import { PaymentRepository } from "./payment.repository.js";

export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  charge(amount: number): number {
    return this.paymentRepository.save(amount);
  }
}
