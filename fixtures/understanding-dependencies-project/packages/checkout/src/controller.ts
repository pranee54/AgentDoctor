import { checkout } from "./service.js";

export class CheckoutController {
  run(amount: number): number {
    return checkout(amount);
  }
}
