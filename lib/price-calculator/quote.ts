export type ShippingCurrency = "CNY" | "USD";

export type FeeSettings = {
  /** Final value fee, percent of the order total. */
  finalValueFeePercent: number;
  /** Extra percent when the buyer is outside the seller's country. */
  internationalFeePercent: number;
  /** Charged when the order total is over $10. */
  perOrderFeeUsd: number;
  /** Charged when the order total is $10 or less. */
  perOrderFeeUnder10Usd: number;
  /** VAT applied on top of the selling fees. */
  vatOnFeesPercent: number;
  /** Buyer tax rate. It raises the fee base and is not paid out. */
  buyerTaxPercent: number;
  /** Postage collected from the buyer. */
  buyerPostageUsd: number;
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
  netUsd: number;
  buyerTaxUsd: number;
  orderTotalUsd: number;
  perOrderFeeUsd: number;
};

export type QuoteResult = Quote | { error: string };

export const DEFAULT_FEES: FeeSettings = {
  finalValueFeePercent: 13.6,
  internationalFeePercent: 1.65,
  perOrderFeeUsd: 0.4,
  perOrderFeeUnder10Usd: 0.3,
  vatOnFeesPercent: 19,
  buyerTaxPercent: 0,
  buyerPostageUsd: 0,
};

export const DEFAULT_RATES: Rates = {
  cnyPerUsd: 7.2,
  eurPerUsd: 0.846,
};

function isQuote(result: QuoteResult): result is Quote {
  return !("error" in result);
}

export function quoteError(result: QuoteResult): string | null {
  return isQuote(result) ? null : result.error;
}

/**
 * Smallest USD list price whose euro payout covers product, shipping, and
 * the desired profit. Fees are a percent of (price + buyer tax + postage)
 * plus a per-order amount, then VAT on those fees. Buyer tax is not received.
 */
export function quoteSellPrice(input: QuoteInput): QuoteResult {
  const { rates, fees } = input;

  if (!(rates.cnyPerUsd > 0) || !(rates.eurPerUsd > 0)) {
    return { error: "Exchange rates must be greater than zero." };
  }
  if (
    input.desiredProfitEur < 0 ||
    input.productCostCny < 0 ||
    input.shippingCost < 0 ||
    fees.buyerPostageUsd < 0 ||
    fees.finalValueFeePercent < 0 ||
    fees.internationalFeePercent < 0 ||
    fees.vatOnFeesPercent < 0 ||
    fees.buyerTaxPercent < 0 ||
    fees.perOrderFeeUsd < 0 ||
    fees.perOrderFeeUnder10Usd < 0
  ) {
    return { error: "Amounts and fee percents cannot be negative." };
  }

  const productUsd = input.productCostCny / rates.cnyPerUsd;
  const shippingUsd =
    input.shippingCurrency === "CNY"
      ? input.shippingCost / rates.cnyPerUsd
      : input.shippingCost;
  const targetNetUsd =
    input.desiredProfitEur / rates.eurPerUsd + productUsd + shippingUsd;

  const vat = 1 + fees.vatOnFeesPercent / 100;
  const variableRate =
    (fees.finalValueFeePercent + fees.internationalFeePercent) / 100;
  const taxFactor = 1 + fees.buyerTaxPercent / 100;
  const postage = fees.buyerPostageUsd;

  function solve(perOrder: number): number | null {
    const slope = vat * variableRate * taxFactor;
    const fixed = vat * (variableRate * postage + perOrder);
    if (slope >= 1) return null;
    const price = (targetNetUsd - postage + fixed) / (1 - slope);
    if (!Number.isFinite(price) || price < 0) return null;
    return price;
  }

  const orderTotal = (price: number) => price * taxFactor + postage;

  let perOrder = fees.perOrderFeeUsd;
  let raw = solve(perOrder);
  if (raw == null) {
    return { error: "These fees take the whole sale. Lower the commission." };
  }

  if (
    orderTotal(raw) <= 10 &&
    fees.perOrderFeeUnder10Usd !== fees.perOrderFeeUsd
  ) {
    const low = solve(fees.perOrderFeeUnder10Usd);
    if (low != null && orderTotal(low) <= 10) {
      raw = low;
      perOrder = fees.perOrderFeeUnder10Usd;
    }
  }

  const sellPriceUsd = Math.ceil(raw * 100 - 1e-9) / 100;
  const buyerTaxUsd = sellPriceUsd * (fees.buyerTaxPercent / 100);
  const orderTotalUsd = sellPriceUsd * taxFactor + postage;
  const appliedPerOrder =
    orderTotalUsd <= 10 ? fees.perOrderFeeUnder10Usd : fees.perOrderFeeUsd;
  const feeUsd = vat * (variableRate * orderTotalUsd + appliedPerOrder);
  const netUsd = sellPriceUsd + postage - feeUsd;
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
    netUsd,
    buyerTaxUsd,
    orderTotalUsd,
    perOrderFeeUsd: appliedPerOrder,
  };
}
