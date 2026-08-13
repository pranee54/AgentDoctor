import { PaymentRepository } from "./repository.js";

export function loadPayment(id: string): string {
  return new PaymentRepository().find(id);
}
