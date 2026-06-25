import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CutitaruLegalPage } from "@/components/cutitaru/CutitaruLegalPage";
import { CutitaruServicePage } from "@/components/cutitaru/CutitaruServicePage";
import { legalMetadata, serviceMetadata } from "@/lib/cutitaru/metadata";
import { resolveSlugRoute } from "@/lib/cutitaru/routes";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = resolveSlugRoute("ru", slug);
  if (!route) return {};
  if (route.type === "service" && route.serviceKey) {
    return serviceMetadata("ru", route.serviceKey);
  }
  if (route.type === "legal" && route.legalKey) {
    return legalMetadata("ru", route.legalKey);
  }
  return {};
}

export default async function CutitaruRuSlugPage({ params }: Props) {
  const { slug } = await params;
  const route = resolveSlugRoute("ru", slug);
  if (!route) notFound();

  if (route.type === "service" && route.serviceKey) {
    return <CutitaruServicePage locale="ru" serviceKey={route.serviceKey} />;
  }
  if (route.type === "legal" && route.legalKey) {
    return <CutitaruLegalPage locale="ru" legalKey={route.legalKey} />;
  }

  notFound();
}
