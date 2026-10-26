// The trial coupon makes StreamPay's page show 0 due today, so it must be taken
// off the subscription straight away or it would discount every renewal.
// StreamPay is mocked; no network.

import { describe, it, expect, vi, beforeEach } from "vitest";

const setSubscriptionCoupons = vi.fn();
vi.mock("../server/lib/streampay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/lib/streampay")>();
  return { ...actual, setSubscriptionCoupons: (...a: unknown[]) => setSubscriptionCoupons(...a) };
});

import { stripTrialCoupon, TRIAL_COUPON_NAME } from "../server/lib/billing";
import type { StreamPaySubscription } from "../server/lib/streampay";

const sub = (over: Partial<StreamPaySubscription> = {}): StreamPaySubscription => ({
  id: "s1",
  status: "TRIALING",
  items: [{ product_id: "p1", quantity: 1 }],
  coupon_calculation_metadata: { coupons: [{ coupon_id: "c-trial", name: TRIAL_COUPON_NAME }] },
  ...over,
});

beforeEach(() => setSubscriptionCoupons.mockReset());

describe("stripTrialCoupon", () => {
  it("removes the trial coupon, keeps others, and confirms StreamPay scheduled it", async () => {
    setSubscriptionCoupons.mockResolvedValue({ id: "s1", status: "TRIALING", pending_change: { target_subscription_coupon_ids: ["c-other"], effective_at: "2026-11-25" } });
    const s = sub({ coupon_calculation_metadata: { coupons: [{ coupon_id: "c-trial", name: TRIAL_COUPON_NAME }, { coupon_id: "c-other", name: "Other" }] } });
    expect(await stripTrialCoupon(s)).toBe(true);
    expect(setSubscriptionCoupons).toHaveBeenCalledWith("s1", [{ product_id: "p1", quantity: 1 }], ["c-other"]);
  });

  it("does nothing for a subscription without the trial coupon", async () => {
    expect(await stripTrialCoupon(sub({ coupon_calculation_metadata: { coupons: [{ coupon_id: "x", name: "Other" }] } }))).toBe(false);
    expect(await stripTrialCoupon(sub({ coupon_calculation_metadata: null }))).toBe(false);
    expect(setSubscriptionCoupons).not.toHaveBeenCalled();
  });

  it("does not repeat a removal that is already scheduled", async () => {
    expect(await stripTrialCoupon(sub({ pending_change: { target_subscription_coupon_ids: [] } }))).toBe(false);
    expect(setSubscriptionCoupons).not.toHaveBeenCalled();
  });

  it("throws when StreamPay does not confirm the removal, so it is retried and alerted", async () => {
    setSubscriptionCoupons.mockResolvedValue({ id: "s1", status: "TRIALING", pending_change: null });
    await expect(stripTrialCoupon(sub())).rejects.toThrow(/not scheduled/);
    setSubscriptionCoupons.mockResolvedValue({ id: "s1", status: "TRIALING", pending_change: { target_subscription_coupon_ids: ["c-trial"] } });
    await expect(stripTrialCoupon(sub())).rejects.toThrow(/not scheduled/);
  });
});
