import type { Metadata } from "next";
import { ReelSaveApp } from "@/components/reelsave/ReelSaveApp";

export const metadata: Metadata = {
  title: "ReelSave",
  description:
    "Paste an Instagram or TikTok link and download the video without watermark in high quality.",
  openGraph: {
    title: "ReelSave | SPACE by cutitaru",
    description:
      "Download Instagram Reels and TikTok videos without watermark.",
    url: "https://space.cutitaru.com/reelsave",
  },
};

export default function ReelSavePage() {
  return <ReelSaveApp />;
}
