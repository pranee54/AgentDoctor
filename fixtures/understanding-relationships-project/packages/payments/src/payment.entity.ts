import type { PaymentStore } from "./payment.store.js";

// @Entity
export class PaymentEntity implements PaymentStore {
  amount = 0;
}
