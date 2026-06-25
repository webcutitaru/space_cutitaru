import type { Metadata } from "next";
import { CutitaruHomePage } from "@/components/cutitaru/CutitaruHomePage";
import { homeMetadata } from "@/lib/cutitaru/metadata";

export function generateMetadata(): Metadata {
  return homeMetadata("en");
}

export default function CutitaruEnHomePage() {
  return <CutitaruHomePage locale="en" />;
}
