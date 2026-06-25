import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CutitaruLegalPage } from "@/components/cutitaru/CutitaruLegalPage";
import { CutitaruServicePage } from "@/components/cutitaru/CutitaruServicePage";
import { legalMetadata, serviceMetadata } from "@/lib/cutitaru/metadata";
import { resolveSlugRoute } from "@/lib/cutitaru/routes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = resolveSlugRoute("ro", slug);
  if (!route) return {};
  if (route.type === "service" && route.serviceKey) {
    return serviceMetadata("ro", route.serviceKey);
  }
  if (route.type === "legal" && route.legalKey) {
    return legalMetadata("ro", route.legalKey);
  }
  return {};
}

export default async function CutitaruRoSlugPage({ params }: Props) {
  const { slug } = await params;
  const route = resolveSlugRoute("ro", slug);
  if (!route) notFound();

  if (route.type === "service" && route.serviceKey) {
    return <CutitaruServicePage locale="ro" serviceKey={route.serviceKey} />;
  }
  if (route.type === "legal" && route.legalKey) {
    return <CutitaruLegalPage locale="ro" legalKey={route.legalKey} />;
  }

  notFound();
}
