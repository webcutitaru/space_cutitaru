#!/usr/bin/env node
/**
 * One-time export of cutitaru content from webcutitaru Python source.
 * Usage: node scripts/import-cutitaru-content.mjs
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "..", "webcutitaru.git", "webcutitaru");
const OUT = join(ROOT, "lib", "cutitaru");
const genPath = join(SOURCE, "scripts", "generate-site.py");

const pyScript = `
import json
from pathlib import Path
gen_path = Path(${JSON.stringify(genPath)})
code = gen_path.read_text(encoding="utf-8")
prefix = code.split("def build_service_page")[0]
ns = {"__file__": str(gen_path), "__name__": "generate_site"}
exec(prefix, ns)
out = {
  "HOME": ns["HOME"],
  "SERVICE_PAGES": ns["SERVICE_PAGES"],
  "LEGAL_FILES": ns["LEGAL_FILES"],
  "LANGS": ns["LANGS"],
  "SERVICE_LINKS": ns["SERVICE_LINKS"],
  "PARTNERS_ROW1": ns["PARTNERS_ROW1"],
  "PARTNERS_ROW2": ns["PARTNERS_ROW2"],
}
print(json.dumps(out, ensure_ascii=False))
`;

mkdirSync(join(OUT, "content"), { recursive: true });
mkdirSync(join(OUT, "legal"), { recursive: true });

const exported = execFileSync("python3", ["-c", pyScript], { encoding: "utf-8" });
writeFileSync(join(OUT, "content", "exported.json"), exported, "utf-8");
console.log("Exported content to lib/cutitaru/content/exported.json");

for (const lang of ["ro", "en", "ru"]) {
  for (const page of ["privacy", "cookies", "terms"]) {
    const src = join(SOURCE, "content", "legal", lang, `${page}.body.html`);
    const dst = join(OUT, "legal", `${lang}-${page}.html`);
    if (existsSync(src)) cpSync(src, dst);
  }
}

const pub = join(ROOT, "public", "cutitaru");
mkdirSync(join(pub, "partners"), { recursive: true });
mkdirSync(join(pub, "renders"), { recursive: true });
if (existsSync(join(SOURCE, "assets", "partners"))) {
  cpSync(join(SOURCE, "assets", "partners"), join(pub, "partners"), { recursive: true });
}
if (existsSync(join(SOURCE, "cutitaru-logo.png"))) {
  cpSync(join(SOURCE, "cutitaru-logo.png"), join(pub, "logo.png"));
}

console.log("Done.");
