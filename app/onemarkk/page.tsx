import type { Metadata } from "next";
import { OneMarkkPage } from "@/components/onemarkk/OneMarkkPage";

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
  return <OneMarkkPage />;
}
