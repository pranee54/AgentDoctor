import { CheckoutController } from "../../../packages/checkout/src/controller.js";

export function ordersRoute(): CheckoutController {
  return new CheckoutController();
}
