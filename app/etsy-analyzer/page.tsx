import type { Metadata } from "next";
import { EtsyAnalyzerApp } from "@/components/etsy-analyzer/EtsyAnalyzerApp";

export const metadata: Metadata = {
  title: "Etsy Analyzer",
  description:
    "Paste Etsy listing HTML, compare 1–5 products, and get a plain-language reference verdict.",
  openGraph: {
    title: "Etsy Analyzer | SPACE by cutitaru",
    description:
      "Compare Etsy listing pages and see what looks like a solid niche reference.",
    url: "https://space.cutitaru.com/etsy-analyzer",
  },
};

export default function EtsyAnalyzerPage() {
  return <EtsyAnalyzerApp />;
}
