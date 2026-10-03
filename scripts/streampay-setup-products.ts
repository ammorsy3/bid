// Creates Bid's four plan products in StreamPay, if they aren't there yet.
//
//   npx tsx scripts/streampay-setup-products.ts            # create what's missing
//   npx tsx scripts/streampay-setup-products.ts --check    # only report, change nothing
//
// Uses STREAMPAY_API_KEY from .env / .env.local. Safe to re-run: products are
// matched by their plan key (external_metadata.bid_plan_key = bid-pro-monthly,
// …), and existing ones are never
// changed. A product whose price no longer matches shared/billing-plans.ts is
// reported, not edited — StreamPay won't let a price change touch products
// already on finalised invoices, and a silent price change is exactly what
// shouldn't happen to paying customers. Change it in the dashboard on purpose.

import { config } from "dotenv";
config({ path: ".env.local" });
config();

import {
  BILLING_CURRENCY,
  BILLING_TERMS,
  PAID_PLANS,
  periodPrice,
  productExternalId,
} from "../shared/billing-plans";
import { PLAN_KEY_METADATA, createProduct, listAllProducts, productPlanKey } from "../server/lib/streampay";

const checkOnly = process.argv.includes("--check");

async function main() {
  const existing = await listAllProducts();
  let problems = 0;

  for (const plan of PAID_PLANS) {
    for (const term of BILLING_TERMS) {
      const externalId = productExternalId(plan, term);
      const price = periodPrice(plan, term);
      const name = `Bid ${plan === "pro" ? "Pro" : "Business"} — ${term === "yearly" ? "Yearly" : "Monthly"}`;
      // An old product may still carry this key after a price change; only the active one counts.
      const found = existing.find((p) => productPlanKey(p) === externalId && p.is_active !== false);

      if (found) {
        // `price` is what the customer pays (VAT included); compare the pre-VAT one.
        const livePrice = Number(found.price_excluding_vat);
        const ok = livePrice === price && found.type === "RECURRING" && found.is_price_inclusive_of_vat === false;
        if (!ok) problems++;
        console.log(
          `${ok ? "✓" : "✗"} ${externalId}  ${found.id}  ${found.price_excluding_vat} + VAT ${found.vat_amount} = ${found.price} ${found.currency ?? ""}` +
          ` vatInclusive=${found.is_price_inclusive_of_vat} active=${found.is_active}` +
          (ok ? "" : `  ← expected ${price} ${BILLING_CURRENCY}, RECURRING, VAT exclusive`),
        );
        continue;
      }

      if (checkOnly) {
        problems++;
        console.log(`✗ ${externalId}  missing`);
        continue;
      }

      const created = await createProduct({
        name,
        description: "Bid subscription. Price excludes 15% VAT.",
        type: "RECURRING",
        recurring_interval: term === "yearly" ? "YEAR" : "MONTH",
        recurring_interval_count: 1,
        prices: [{ currency: BILLING_CURRENCY, amount: price, is_price_inclusive_of_vat: false }],
        external_metadata: { [PLAN_KEY_METADATA]: externalId },
      });
      console.log(`+ ${externalId}  created ${created.id}  ${created.price_excluding_vat} + VAT = ${created.price} ${created.currency ?? ""}`);
    }
  }

  if (problems > 0) {
    console.log(`\n${problems} product(s) need attention.`);
    process.exit(1);
  }
  console.log("\nAll plan products are in place.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
