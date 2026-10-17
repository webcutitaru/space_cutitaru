import type { Metadata } from "next";
import { OneMarkkPage } from "@/components/onemarkk/OneMarkkPage";

export const metadata: Metadata = {
  title: "OneMarkk Pro",
  description:
    "Tema Shopify OneMarkk Pro 1.6.4, exclusiv pentru Cursul ExperDropshipping. Homepage, pagina de produs și coșul vin deja aranjate.",
  openGraph: {
    title: "OneMarkk Pro | SPACE by cutitaru",
    description: "Temă Shopify exclusivă pentru Cursul ExperDropshipping.",
    url: "https://space.cutitaru.com/onemarkk",
  },
};

export default function OnemarkkRoute() {
  return <OneMarkkPage />;
}
