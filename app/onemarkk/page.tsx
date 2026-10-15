import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";
import { OneMarkkPage } from "@/components/onemarkk/OneMarkkPage";

const display = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-mark",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OneMarkk Pro",
  description:
    "Temă Shopify OneMarkk Pro 1.5.0, exclusiv pentru Cursul ExperDropshipping. Introdu emailul, așteaptă verificarea și descarcă arhiva.",
  openGraph: {
    title: "OneMarkk Pro | SPACE by cutitaru",
    description: "Temă Shopify exclusivă pentru Cursul ExperDropshipping.",
    url: "https://space.cutitaru.com/onemarkk",
  },
};

export default function OnemarkkRoute() {
  return (
    <div className={display.variable}>
      <OneMarkkPage />
    </div>
  );
}
