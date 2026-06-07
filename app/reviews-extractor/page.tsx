import type { Metadata } from "next";
import { ReviewsExtractorApp } from "@/components/reviews/ReviewsExtractorApp";

export const metadata: Metadata = {
  title: "Reviews Extractor",
  description:
    "Extract Shopify store reviews from Judge.me, Loox, Yotpo, and native review widgets. Preview and download CSV or JSON.",
  openGraph: {
    title: "Reviews Extractor | SPACE by cutitaru",
    description:
      "Extract Shopify store reviews from Judge.me, Loox, Yotpo, and native review widgets.",
    url: "https://space.cutitaru.com/reviews-extractor",
  },
};

export default function ReviewsExtractorPage() {
  return <ReviewsExtractorApp />;
}
