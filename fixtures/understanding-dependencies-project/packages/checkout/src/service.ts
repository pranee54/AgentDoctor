import { charge } from "@acme/payments";

export function checkout(amount: number): number {
  return charge(amount);
}
