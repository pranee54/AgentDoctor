export function charge(amount: number): number {
  return amount;
}

export function notifyCheckout(): void {
  // cycle edge: payments → checkout
  void import("@acme/checkout");
}
