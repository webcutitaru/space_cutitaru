export type ShippingCurrency = "CNY" | "USD";

export type FeeSettings = {
  /** Percent kept from the dollar list price. */
  commissionPercent: number;
  /** Extra dollars taken on every order. */
  fixedFeeUsd: number;
};

export type Rates = {
  /** How many CNY equal 1 USD. */
  cnyPerUsd: number;
  /** Euros received per 1 USD after conversion. */
  eurPerUsd: number;
};

export type QuoteInput = {
  desiredProfitEur: number;
  productCostCny: number;
  shippingCost: number;
  shippingCurrency: ShippingCurrency;
  rates: Rates;
  fees: FeeSettings;
};

export type Quote = {
  sellPriceUsd: number;
  payoutEur: number;
  profitEur: number;
  productUsd: number;
  productEur: number;
  shippingUsd: number;
  shippingEur: number;
  feeUsd: number;
  feeEur: number;
};

export type QuoteResult = Quote | { error: string };

/** 13.6% + 1.65%, then 19% VAT on that fee → 18.15% of the price. */
export const DEFAULT_FEES: FeeSettings = {
  commissionPercent: 18.15,
  fixedFeeUsd: 0.48,
};

export const DEFAULT_RATES: Rates = {
  cnyPerUsd: 7.2,
  eurPerUsd: 0.846,
};

/**
 * Smallest USD list price whose euro payout covers product, shipping, and
 * the desired profit. Commission is one percent of the list price plus a
 * fixed amount per order.
 */
export function quoteSellPrice(input: QuoteInput): QuoteResult {
  const { rates, fees } = input;

  if (!(rates.cnyPerUsd > 0) || !(rates.eurPerUsd > 0)) {
    return { error: "Cursul trebuie să fie mai mare decât zero." };
  }
  if (
    input.desiredProfitEur < 0 ||
    input.productCostCny < 0 ||
    input.shippingCost < 0 ||
    fees.commissionPercent < 0 ||
    fees.fixedFeeUsd < 0
  ) {
    return { error: "Sumele nu pot fi negative." };
  }

  const rate = fees.commissionPercent / 100;
  if (rate >= 1) {
    return { error: "Comisionul e prea mare. Pune un procent sub 100." };
  }

  const productUsd = input.productCostCny / rates.cnyPerUsd;
  const shippingUsd =
    input.shippingCurrency === "CNY"
      ? input.shippingCost / rates.cnyPerUsd
      : input.shippingCost;
  const targetNetUsd =
    input.desiredProfitEur / rates.eurPerUsd + productUsd + shippingUsd;

  const raw = (targetNetUsd + fees.fixedFeeUsd) / (1 - rate);
  if (!Number.isFinite(raw) || raw < 0) {
    return { error: "Nu iese un preț cu datele astea." };
  }

  const sellPriceUsd = Math.ceil(raw * 100 - 1e-9) / 100;
  const feeUsd = rate * sellPriceUsd + fees.fixedFeeUsd;
  const netUsd = sellPriceUsd - feeUsd;
  const payoutEur = netUsd * rates.eurPerUsd;
  const productEur = productUsd * rates.eurPerUsd;
  const shippingEur = shippingUsd * rates.eurPerUsd;

  return {
    sellPriceUsd,
    payoutEur,
    profitEur: payoutEur - productEur - shippingEur,
    productUsd,
    productEur,
    shippingUsd,
    shippingEur,
    feeUsd,
    feeEur: feeUsd * rates.eurPerUsd,
  };
}
