const PROJECTS: Record<string, string> = {
  "/": "Home",
  "/reviews-extractor": "Reviews Extractor",
  "/image-converter": "Image Converter",
  "/link2pic": "Link2Pic",
  "/reelsave": "ReelSave",
  "/etsy-analyzer": "Etsy Analyzer",
  "/price-calculator": "Price Calculator",
};

export function projectName(path: string): string {
  const pathname = path.split("?")[0] || "/";
  if (PROJECTS[pathname]) return PROJECTS[pathname];
  const match = Object.keys(PROJECTS)
    .filter((key) => key !== "/" && pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PROJECTS[match] : pathname;
}
