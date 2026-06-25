import exported from "./exported.json";
import type { HomeContent, Locale, Partner, ServiceKey, ServicePageContent } from "../types";

export const HOME = exported.HOME as unknown as Record<Locale, HomeContent>;
export const SERVICE_PAGES = exported.SERVICE_PAGES as unknown as Record<
  ServiceKey,
  Record<Locale, ServicePageContent>
>;
export const LEGAL_FILES = exported.LEGAL_FILES as unknown as Record<
  string,
  Record<Locale, string>
>;
export const SERVICE_LINKS = exported.SERVICE_LINKS as unknown as Record<
  Locale,
  Record<ServiceKey, string>
>;
export const PARTNERS_ROW1 = exported.PARTNERS_ROW1 as Partner[];
export const PARTNERS_ROW2 = exported.PARTNERS_ROW2 as Partner[];
