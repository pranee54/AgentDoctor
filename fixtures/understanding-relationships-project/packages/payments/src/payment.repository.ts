import { PaymentEntity } from "./payment.entity.js";

export class PaymentRepository {
  save(amount: number): number {
    const row = new PaymentEntity();
    row.amount = amount;
    return row.amount;
  }
}
