import type { Metadata } from "next";
import { Link2PicApp } from "@/components/link2pic/Link2PicApp";

export const metadata: Metadata = {
  title: "Link2Pic",
  description:
    "Paste a product link and download available images.",
  openGraph: {
    title: "Link2Pic | SPACE by cutitaru",
    description:
      "Paste a product link and download available images.",
    url: "https://space.cutitaru.com/link2pic",
  },
};

export default function Link2PicPage() {
  return <Link2PicApp />;
}
