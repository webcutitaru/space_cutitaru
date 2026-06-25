import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homePath } from "./i18n";
import { LEGAL_UPDATED } from "./legal-meta";
import type { LegalKey, Locale } from "./types";

export function loadLegalHtml(locale: Locale, key: LegalKey): string {
  const filePath = join(process.cwd(), "lib", "cutitaru", "legal", `${locale}-${key}.html`);
  let html = readFileSync(filePath, "utf-8");

  const contactUrl = `${homePath(locale)}#contact`;

  html = html
    .replace(/\{\{UPDATED\}\}/g, LEGAL_UPDATED[locale])
    .replace(/\{\{CONTACT\}\}/g, contactUrl)
    .replace(/contact\.php/g, "/api/cutitaru/contact");

  return html;
}
