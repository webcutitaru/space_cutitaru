import type { Metadata } from "next";
import { PriceCalculatorApp } from "@/components/price-calculator/PriceCalculatorApp";

export const metadata: Metadata = {
  title: "Price Calculator",
  description:
    "Enter your profit, product cost, shipping, and one commission. Get the dollar price and the euros you receive.",
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
