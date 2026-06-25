import type { Metadata } from "next";
import { CutitaruHomePage } from "@/components/cutitaru/CutitaruHomePage";
import { homeMetadata } from "@/lib/cutitaru/metadata";

export function generateMetadata(): Metadata {
  return homeMetadata("ru");
}

export default function CutitaruRuHomePage() {
  return <CutitaruHomePage locale="ru" />;
}
