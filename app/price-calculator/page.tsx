import type { Metadata } from "next";
import { PriceCalculatorApp } from "@/components/price-calculator/PriceCalculatorApp";

export const metadata: Metadata = {
  title: "Price Calculator",
  description:
    "Set your profit, product cost, shipping, and commission. Get the dollar price to list and the euros you actually receive.",
  openGraph: {
    title: "Price Calculator | SPACE by cutitaru",
    description:
      "Work out a sell price in dollars from yuan cost, shipping, commission, and the euro payout.",
    url: "https://space.cutitaru.com/price-calculator",
  },
};

export default function PriceCalculatorPage() {
  return <PriceCalculatorApp />;
}
