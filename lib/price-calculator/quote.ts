export type MoneyCurrency = "CNY" | "USD";
export type AdMode = "percent" | "daily";

export type Rates = {
  /** How many CNY equal 1 USD. */
  cnyPerUsd: number;
  /** Market euros per 1 USD, before the conversion charge. */
  eurPerUsd: number;
  /** Percent kept on the currency conversion. */
  conversionPercent: number;
};

export type QuoteInput = {
  desiredProfitEur: number;
  productCost: number;
  productCurrency: MoneyCurrency;
  agentPercent: number;
  shippingCost: number;
  shippingCurrency: MoneyCurrency;
  platformPercent: number;
  adMode: AdMode;
  adPercent: number;
  adVatPercent: number;
  dailyAdUsd: number;
  salesPerDay: number;
  rates: Rates;
};

export type Quote = {
  sellPriceUsd: number;
  payoutEur: number;
  profitEur: number;
  subtotalEur: number;
  conversionEur: number;
  platformEur: number;
  adEur: number;
  adVatEur: number;
  agentEur: number;
  productEur: number;
  shippingEur: number;
};

export type QuoteResult = Quote | { error: string };

export const DEFAULT_RATES: Rates = {
  cnyPerUsd: 7.2,
  eurPerUsd: 0.85,
  conversionPercent: 3,
};

export const DEFAULT_PLATFORM_PERCENT = 18.15;
export const DEFAULT_AD_VAT_PERCENT = 19;

function toUsd(amount: number, currency: MoneyCurrency, cnyPerUsd: number): number {
  return currency === "CNY" ? amount / cnyPerUsd : amount;
}

/**
 * Smallest USD price whose euro payout still leaves the desired profit
 * after the agent, shipping, platform percent, ads, and conversion.
 */
export function quoteSellPrice(input: QuoteInput): QuoteResult {
  const { rates } = input;

  if (!(rates.cnyPerUsd > 0) || !(rates.eurPerUsd > 0)) {
    return { error: "Cursul trebuie să fie mai mare decât zero." };
  }
  if (rates.conversionPercent < 0 || rates.conversionPercent >= 100) {
    return { error: "Conversia trebuie să fie între 0 și 100." };
  }
  if (
    input.desiredProfitEur < 0 ||
    input.productCost < 0 ||
    input.shippingCost < 0 ||
    input.agentPercent < 0 ||
    input.platformPercent < 0 ||
    input.adPercent < 0 ||
    input.adVatPercent < 0 ||
    input.dailyAdUsd < 0
  ) {
    return { error: "Sumele nu pot fi negative." };
  }

  const platformRate = input.platformPercent / 100;
  const adRate =
    input.adMode === "percent"
      ? (input.adPercent / 100) * (1 + input.adVatPercent / 100)
      : 0;
  if (platformRate + adRate >= 1) {
    return { error: "Platforma și reclama iau tot prețul. Scade procentele." };
  }
  if (input.adMode === "daily" && !(input.salesPerDay > 0)) {
    return { error: "Pune câte vânzări estimezi pe zi." };
  }

  const receivedPerUsd = rates.eurPerUsd * (1 - rates.conversionPercent / 100);
  const productUsd = toUsd(input.productCost, input.productCurrency, rates.cnyPerUsd);
  const agentUsd = productUsd * (input.agentPercent / 100);
  const shippingUsd = toUsd(input.shippingCost, input.shippingCurrency, rates.cnyPerUsd);
  const dailyAdUsd = input.adMode === "daily" ? input.dailyAdUsd / input.salesPerDay : 0;
  const targetNetUsd =
    input.desiredProfitEur / receivedPerUsd + productUsd + agentUsd + shippingUsd + dailyAdUsd;

  const raw = targetNetUsd / (1 - platformRate - adRate);
  if (!Number.isFinite(raw) || raw < 0) {
    return { error: "Nu iese un preț cu datele astea." };
  }

  const sellPriceUsd = Math.ceil(raw * 100 - 1e-9) / 100;
  const platformUsd = platformRate * sellPriceUsd;
  const adUsd =
    input.adMode === "percent" ? (input.adPercent / 100) * sellPriceUsd : dailyAdUsd;
  const adVatUsd = input.adMode === "percent" ? adUsd * (input.adVatPercent / 100) : 0;
  const netUsd = sellPriceUsd - platformUsd - adUsd - adVatUsd;
  const market = rates.eurPerUsd;
  const received = receivedPerUsd;

  const subtotalEur = sellPriceUsd * market;
  const conversionEur = netUsd * market * (rates.conversionPercent / 100);
  const payoutEur = netUsd * received;
  const productEur = productUsd * received;
  const agentEur = agentUsd * received;
  const shippingEur = shippingUsd * received;

  return {
    sellPriceUsd,
    payoutEur,
    profitEur: payoutEur - productEur - agentEur - shippingEur,
    subtotalEur,
    conversionEur,
    platformEur: platformUsd * market,
    adEur: adUsd * market,
    adVatEur: adVatUsd * market,
    agentEur,
    productEur,
    shippingEur,
  };
}
