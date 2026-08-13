/**
 * Deterministic synonym → canonical domain label map.
 * First matching synonym wins for a token; evidence aggregates per canonical name.
 */
export const DOMAIN_LEXICON: ReadonlyArray<{ name: string; synonyms: readonly string[] }> = [
  {
    name: "Payments",
    synonyms: [
      "payment",
      "payments",
      "billing",
      "invoice",
      "invoices",
      "checkout",
      "stripe",
      "paypal",
      "refund",
      "refunds",
      "subscription",
      "subscriptions",
      "charge",
      "charges",
    ],
  },
  {
    name: "Auth",
    synonyms: [
      "auth",
      "authentication",
      "authorization",
      "login",
      "logout",
      "oauth",
      "oidc",
      "sso",
      "session",
      "sessions",
      "password",
      "passwords",
      "jwt",
      "rbac",
    ],
  },
  {
    name: "Users",
    synonyms: [
      "user",
      "users",
      "account",
      "accounts",
      "profile",
      "profiles",
      "identity",
      "identities",
    ],
  },
  {
    name: "Orders",
    synonyms: ["order", "orders", "cart", "carts", "checkoutcart", "fulfillment"],
  },
  {
    name: "Notifications",
    synonyms: [
      "notification",
      "notifications",
      "notify",
      "email",
      "emails",
      "mailer",
      "sms",
      "push",
      "webhook",
      "webhooks",
    ],
  },
  {
    name: "Inventory",
    synonyms: ["inventory", "stock", "sku", "skus", "warehouse", "catalog", "catalogue"],
  },
  {
    name: "Shipping",
    synonyms: ["shipping", "shipment", "shipments", "delivery", "logistics", "carrier"],
  },
  {
    name: "Admin",
    synonyms: ["admin", "admins", "backoffice", "dashboard"],
  },
  {
    name: "Analytics",
    synonyms: ["analytics", "metrics", "telemetry", "tracking", "reporting", "reports"],
  },
  {
    name: "Search",
    synonyms: ["search", "elasticsearch", "opensearch", "solr", "indexer", "indexing"],
  },
];

const TOKEN_TO_DOMAIN = new Map<string, string>();
for (const entry of DOMAIN_LEXICON) {
  for (const synonym of entry.synonyms) {
    if (!TOKEN_TO_DOMAIN.has(synonym)) {
      TOKEN_TO_DOMAIN.set(synonym, entry.name);
    }
  }
}

export function domainForToken(token: string): string | undefined {
  return TOKEN_TO_DOMAIN.get(token);
}
