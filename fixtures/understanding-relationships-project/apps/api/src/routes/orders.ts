import { CheckoutController } from "../../../../packages/checkout/src/checkout.controller.js";

export function ordersRoute(): CheckoutController {
  return new CheckoutController({} as never);
}
