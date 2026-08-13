import { CheckoutController } from "@acme/checkout/controller";

export function boot(): void {
  new CheckoutController().run(10);
}
