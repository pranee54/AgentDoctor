import { AppConfig } from "./config/app.config.js";
import { CheckoutController } from "../../../../packages/checkout/src/checkout.controller.js";

@Module({ controllers: [CheckoutController] })
export class AppModule {
  constructor(private readonly config: AppConfig) {}
}
