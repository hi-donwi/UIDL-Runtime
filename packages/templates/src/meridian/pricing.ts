/**
 * Pricing & Discount Engine for Meridian (Quote, Invoice, POS).
 *
 * Implements rule evaluation for:
 * 1. Default Price Lists (Selling vs Buying)
 * 2. Volume and Item Group Pricing Rules
 * 3. Coupon Code validation and percentage deductions
 * 4. PPN (VAT) 11% subtotal & grand total calculation
 */

import { items, priceLists, pricingRules, couponCodes } from "./mockData";

export interface ResolvedPrice {
  baseRate: number;
  discountPercent: number;
  effectiveRate: number;
  appliedRule?: string;
}

export interface CalculatedTotals {
  subtotal: number;
  discountAmount: number;
  netAmount: number;
  tax: number;
  total: number;
}

/**
 * Resolves the unit price and automatic discounts for a line item.
 */
export function resolveItemPrice(
  itemId: string,
  kind: "Selling" | "Buying" = "Selling",
  quantity = 1,
  couponCode?: string,
): ResolvedPrice {
  const item = items.find((it) => it.id === itemId);
  const defaultRate = item ? item.rate : 0;

  // 1. Price List rate
  const targetPriceList = priceLists.find((pl) => pl.kind === kind);
  const priceListEntry = targetPriceList?.entries.find((e) => e.item === itemId);
  const baseRate = priceListEntry ? priceListEntry.rate : (kind === "Buying" ? Math.round(defaultRate * 0.72) : defaultRate);

  // 2. Pricing Rule evaluation (Item Group or threshold)
  let ruleDiscountPercent = 0;
  let appliedRule: string | undefined;

  if (item) {
    const matchedRule = pricingRules.find((pr) => pr.appliesTo === item.group);
    if (matchedRule) {
      const isWholesaleTier = quantity >= 10;
      ruleDiscountPercent = isWholesaleTier ? matchedRule.discountPercent + 2 : matchedRule.discountPercent;
      appliedRule = isWholesaleTier ? `${matchedRule.name} (Tier 10+)` : matchedRule.name;
    }
  }

  // 3. Coupon code evaluation
  let couponDiscountPercent = 0;
  if (couponCode) {
    const matchedCoupon = couponCodes.find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    if (matchedCoupon && matchedCoupon.used < matchedCoupon.limit) {
      couponDiscountPercent = matchedCoupon.discountPercent;
      appliedRule = appliedRule ? `${appliedRule} + ${matchedCoupon.code}` : matchedCoupon.code;
    }
  }

  const totalDiscountPercent = Math.min(100, ruleDiscountPercent + couponDiscountPercent);
  const effectiveRate = Math.round(baseRate * (1 - totalDiscountPercent / 100));

  return {
    baseRate,
    discountPercent: totalDiscountPercent,
    effectiveRate,
    appliedRule,
  };
}

/**
 * Calculates line items subtotal, VAT (11%), and grand total.
 */
export function calculateDocumentTotals(
  lines: Array<{ quantity: number; rate: number; discountPercent?: number }>,
  taxPercent = 11,
): CalculatedTotals {
  let subtotal = 0;
  let discountAmount = 0;

  for (const line of lines) {
    const lineGross = line.quantity * line.rate;
    const discount = lineGross * ((line.discountPercent ?? 0) / 100);
    subtotal += lineGross;
    discountAmount += discount;
  }

  const netAmount = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(netAmount * (taxPercent / 100));
  const total = netAmount + tax;

  return {
    subtotal,
    discountAmount,
    netAmount,
    tax,
    total,
  };
}
