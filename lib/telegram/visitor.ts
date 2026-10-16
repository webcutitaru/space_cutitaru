const GEO_TTL = 6 * 60 * 60 * 1000;

const BOT_NEEDLES = [
  "googlebot",
  "adsbot",
  "storebot",
  "mediapartners",
  "feedfetcher",
  "inspectiontool",
  "duplexweb",
  "read-aloud",
  "bingbot",
  "bingpreview",
  "slurp",
  "duckduckbot",
  "baiduspider",
  "yandexbot",
  "applebot",
  "petalbot",
  "facebookexternalhit",
  "twitterbot",
  "linkedinbot",
  "slackbot",
  "telegrambot",
  "discordbot",
  "pinterestbot",
  "redditbot",
  "embedly",
  "quora",
  "outbrain",
  "semrush",
  "ahrefs",
  "mj12bot",
  "dotbot",
  "rogerbot",
  "blexbot",
  "barkrowler",
  "bytespider",
  "gptbot",
  "chatgpt-user",
  "oai-searchbot",
  "claudebot",
  "claude-searchbot",
  "amazonbot",
  "meta-externalagent",
  "ccbot",
  "imagesift",
  "diffbot",
  "dataforseo",
  "serpstat",
  "screaming frog",
  "siteauditbot",
  "zoominfobot",
  "seekport",
  "qwantify",
  "mojeek",
  "seznambot",
  "ia_archiver",
  "archive.org",
  "turnitin",
  "grapeshot",
  "proximic",
  "brandwatch",
  "lighthouse",
  "pagespeed",
  "gtmetrix",
  "ptst/",
  "pingdom",
  "uptimerobot",
  "statuscake",
  "site24x7",
  "better uptime",
  "newrelic",
  "datadog",
  "kube-probe",
  "headless",
  "phantom",
  "puppeteer",
  "playwright",
  "selenium",
  "webdriver",
  "wget",
  "curl/",
  "python-",
  "python/",
  "aiohttp",
  "httpx",
  "scrapy",
  "go-http-client",
  "okhttp",
  "java/",
  "libwww",
  "httpunit",
  "axios",
  "node-fetch",
  "undici",
  "postman",
  "powershell",
  "winhttp",
  "sqlmap",
  "nikto",
  "nmap",
  "masscan",
  "zgrab",
  "nuclei",
  "censys",
  "shodan",
  "netcraft",
  "expanse",
  "stretchoid",
  "leakix",
  "onyphe",
  "criminalip",
  "internet-measurement",
  "palo alto",
  "dirbuster",
  "gobuster",
  "nessus",
  "burpsuite",
  "scanner",
];

const DATACENTERS = [
  "amazon",
  "aws",
  "google llc",
  "google cloud",
  "digitalocean",
  "hetzner",
  "ovh",
  "linode",
  "akamai",
  "oracle",
  "alibaba",
  "tencent",
  "huawei cloud",
  "contabo",
  "vultr",
  "choopa",
  "constant company",
  "leaseweb",
  "m247",
  "datacamp",
  "psychz",
  "scaleway",
  "upcloud",
  "hostinger",
  "ionos",
  "netcup",
  "online s.a.s",
  "g-core",
  "serverius",
  "quadranet",
  "colocrossing",
  "frantech",
  "buyvm",
  "hostwinds",
  "sharktech",
  "privatelayer",
  "zenlayer",
  "cdn77",
  "packethub",
  "microsoft azure",
  "azure",
  "timeweb",
  "selectel",
  "ishosting",
  "stark industries",
  "flyservers",
  "pq hosting",
  "servinga",
  "combahton",
  "alfahosting",
  "strato",
  "godaddy",
  "namecheap",
  "dedicated",
  "vps",
  "hosting",
];

export type Place = {
  country: string;
  city: string;
  isp: string;
  flag: string;
  hosting: boolean;
};

export type ClientProfile = {
  device: string;
  os: string;
  browser: string;
};

export const UNKNOWN_PLACE: Place = {
  country: "",
  city: "",
  isp: "",
  flag: "",
  hosting: false,
};

const geoCache = new Map<string, { at: number; place: Place }>();

export function clip(value: string, max: number): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function clientIp(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return bareIp(cf);
  const real = request.headers.get("x-real-ip");
  if (real) return bareIp(real);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return bareIp(forwarded.split(",")[0] ?? "");
  return "";
}

export function isPrefetch(request: Request): boolean {
  const header = [request.headers.get("purpose"), request.headers.get("sec-purpose"), request.headers.get("x-moz")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return header.includes("prefetch") || header.includes("prerender");
}

export function bareIp(ip: string): string {
  return ip.trim().replace(/^::ffff:/i, "");
}

export function isPrivateIp(ip: string): boolean {
  const clean = bareIp(ip).toLowerCase();
  if (!clean || clean === "::1" || clean === "0.0.0.0" || clean.startsWith("127.")) return true;
  if (clean.startsWith("10.") || clean.startsWith("192.168.") || clean.startsWith("169.254.")) return true;
  const parts = clean.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (clean.startsWith("fc") || clean.startsWith("fd") || clean.startsWith("fe80")) return true;
  return false;
}

export function isAutomated(userAgent: string): boolean {
  const lower = userAgent.toLowerCase().trim();
  if (lower.length < 20) return true;
  if (BOT_NEEDLES.some((needle) => lower.includes(needle))) return true;
  if (/cubot/.test(lower)) return false;
  return /bot(?:[/;)\s]|$)/i.test(userAgent);
}

export function looksLikeBrowser(userAgent: string): boolean {
  return (
    /Mozilla\/5\.0/i.test(userAgent) &&
    /Chrome\/|Safari\/|Firefox\/|Edg\/|EdgiOS\/|CriOS\/|FxiOS\/|OPR\/|SamsungBrowser\/|GSA\/|AppleWebKit\//i.test(userAgent)
  );
}

export function suspiciousPath(value: string): boolean {
  const path = value.split("?")[0] || "";
  if (!path.startsWith("/")) return true;
  return /(?:^|\/)\.|wp-|\.php|xmlrpc|cgi-bin|phpmyadmin|\.asp|\.aspx|boaform|\/etc\/passwd/i.test(path);
}

export function hasHumanSignals(input: { lang: string; tz: string; screen: string }): boolean {
  const lang = input.lang.trim();
  const tz = input.tz.trim();
  const screen = input.screen.trim().match(/^(\d{2,5})x(\d{2,5})@(\d+(?:\.\d+)?)$/);
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(lang)) return false;
  if (!/^[A-Za-z0-9_+/-]{3,80}$/.test(tz)) return false;
  if (!screen) return false;
  const width = Number(screen[1]);
  const height = Number(screen[2]);
  const ratio = Number(screen[3]);
  if (width < 240 || height < 240 || width > 8000 || height > 8000) return false;
  if (ratio < 0.5 || ratio > 6) return false;
  return true;
}

export function rejectVisit(visit: {
  path: string;
  lang: string;
  tz: string;
  screen: string;
  ip: string;
  userAgent: string;
  webdriver: boolean;
  prefetch: boolean;
}): boolean {
  if (visit.webdriver || visit.prefetch) return true;
  if (!visit.ip || isPrivateIp(visit.ip)) return true;
  if (isAutomated(visit.userAgent) || !looksLikeBrowser(visit.userAgent)) return true;
  if (suspiciousPath(visit.path)) return true;
  if (!hasHumanSignals(visit)) return true;
  return false;
}

export function parseClient(userAgent: string, touch = 0): ClientProfile {
  const ua = userAgent || "";
  let device = "Desktop";
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) device = "Tabletă";
  else if (/Mobi|iPhone|iPod|Android/i.test(ua)) device = "Telefon";

  let os = "";
  const mac = ua.match(/Mac OS X (\d+)[_.](\d+)/);
  const ios = ua.match(/(?:iPhone OS|CPU (?:iPhone )?OS) (\d+)[_.](\d+)/);
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (ios) os = `iOS ${ios[1]}`;
  else if (mac) os = Number(mac[1]) >= 11 ? `macOS ${mac[1]}` : "macOS";
  else if (android) os = `Android ${android[1]}`;
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  if (/Macintosh/i.test(ua) && touch > 1) {
    device = "Tabletă";
    os = "iPadOS";
  }

  let browser = "";
  const edge = ua.match(/Edg\/(\d+)/);
  const edgios = ua.match(/EdgiOS\/(\d+)/);
  const crios = ua.match(/CriOS\/(\d+)/);
  const fxios = ua.match(/FxiOS\/(\d+)/);
  const firefox = ua.match(/Firefox\/(\d+)/);
  const opera = ua.match(/OPR\/(\d+)/);
  const samsung = ua.match(/SamsungBrowser\/(\d+)/);
  const chrome = ua.match(/Chrome\/(\d+)/);
  const safari = ua.match(/Version\/(\d+).{0,40}Safari\//);
  if (/Instagram/i.test(ua)) browser = "Instagram";
  else if (/FBAN|FBAV|FB_IAB/i.test(ua)) browser = "Facebook";
  else if (edgios) browser = `Edge ${edgios[1]}`;
  else if (edge) browser = `Edge ${edge[1]}`;
  else if (opera) browser = `Opera ${opera[1]}`;
  else if (samsung) browser = `Samsung ${samsung[1]}`;
  else if (crios) browser = `Chrome ${crios[1]}`;
  else if (fxios) browser = `Firefox ${fxios[1]}`;
  else if (firefox) browser = `Firefox ${firefox[1]}`;
  else if (/GSA\//i.test(ua)) browser = "Google App";
  else if (chrome && !/HeadlessChrome/i.test(ua)) browser = `Chrome ${chrome[1]}`;
  else if (safari) browser = `Safari ${safari[1]}`;

  return {
    device,
    os,
    browser,
  };
}

export function prettyScreen(value: string): string {
  const match = value.trim().match(/^(\d+)x(\d+)@(\d+(?:\.\d+)?)$/i);
  if (!match) return "";
  const ratio = match[3].replace(/\.0+$/, "");
  return `${match[1]}×${match[2]} @${ratio}x`;
}

export function sourceLabel(referrer: string): string {
  const value = referrer.trim();
  if (!value) return "direct";
  try {
    const host = new URL(value).hostname.replace(/^www\./i, "");
    if (!host || /(^|\.)cutitaru\.com$/i.test(host)) return "direct";
    return host;
  } catch {
    return clip(value, 80);
  }
}

export function formatStamp(now = Date.now()): string {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(now));
}

function flagFromCode(code: string): string {
  const clean = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) return "";
  return String.fromCodePoint(...[...clean].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

function datacenter(isp: string, org: string): boolean {
  const blob = `${isp} ${org}`.toLowerCase();
  if (!blob.trim()) return false;
  return DATACENTERS.some((needle) => blob.includes(needle));
}

function composeCity(city: string, region: string): string {
  if (city && region && city.toLowerCase() !== region.toLowerCase()) return `${city}, ${region}`;
  return city || region;
}

async function fetchPlace(ip: string): Promise<Place> {
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?lang=ro`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return UNKNOWN_PLACE;
    const data = (await response.json()) as {
      success?: boolean;
      country?: string;
      country_code?: string;
      region?: string;
      city?: string;
      flag?: { emoji?: string };
      connection?: { isp?: string; org?: string };
    };
    if (!data.success) return UNKNOWN_PLACE;
    const isp = data.connection?.isp?.trim() || data.connection?.org?.trim() || "";
    const org = data.connection?.org?.trim() || "";
    return {
      country: data.country?.trim() || "",
      city: composeCity(data.city?.trim() || "", data.region?.trim() || ""),
      isp,
      flag: data.flag?.emoji?.trim() || flagFromCode(data.country_code || ""),
      hosting: datacenter(isp, org),
    };
  } catch {
    return UNKNOWN_PLACE;
  }
}

export async function lookupPlace(ip: string): Promise<Place> {
  const clean = bareIp(ip);
  if (!clean || isPrivateIp(clean)) return UNKNOWN_PLACE;
  const cached = geoCache.get(clean);
  if (cached && Date.now() - cached.at < GEO_TTL) return cached.place;
  const place = await fetchPlace(clean);
  if (place.country || place.isp) geoCache.set(clean, { at: Date.now(), place });
  return place;
}

function locationLines(ip: string, place: Place): string[] {
  const shown = bareIp(ip);
  const lines = [`IP · ${shown ? `<code>${escapeHtml(shown)}</code>` : "necunoscut"}`];
  const country = [place.country, place.flag].filter(Boolean).join(" ");
  const area = [country, place.city].filter(Boolean).join(" · ");
  if (area) lines.push(escapeHtml(area));
  if (place.isp) lines.push(escapeHtml(clip(place.isp, 80)));
  return lines;
}

function deviceLines(userAgent: string, touch: number, screen: string, lang: string, tz: string): string[] {
  const client = parseClient(userAgent, touch);
  const main = [client.device, client.os, client.browser].filter(Boolean).join(" · ");
  const lines = [main ? escapeHtml(main) : "necunoscut"];
  const pretty = prettyScreen(screen);
  if (pretty) lines.push(escapeHtml(`Ecran ${pretty}`));
  const context = [lang.trim(), tz.trim()].filter(Boolean).join(" · ");
  if (context) lines.push(escapeHtml(context));
  return lines;
}

function section(title: string, lines: string[]): string {
  const body = lines.map((line) => line.trim()).filter(Boolean);
  if (!body.length) return "";
  return [`<b>${title}</b>`, ...body].join("\n");
}

function message(head: string, sections: string[], now: number): string {
  return [head, ...sections.filter(Boolean), `<i>${escapeHtml(formatStamp(now))}</i>`].join("\n\n");
}

export function visitMessage(input: {
  project: string;
  path: string;
  referrer: string;
  lang: string;
  tz: string;
  screen: string;
  ip: string;
  userAgent: string;
  touch: number;
  place: Place;
  now: number;
}): string {
  const path = clip(input.path, 180) || "/";
  return message(
    `<b>Vizită · ${escapeHtml(input.project)}</b>\n${escapeHtml(path)}`,
    [
      section("De unde", [...locationLines(input.ip, input.place), `Sursă · ${escapeHtml(sourceLabel(input.referrer))}`]),
      section("Dispozitiv", deviceLines(input.userAgent, input.touch, input.screen, input.lang, input.tz)),
    ],
    input.now,
  );
}

export function downloadMessage(input: {
  email: string;
  fileName: string;
  referrer: string;
  lang: string;
  tz: string;
  screen: string;
  ip: string;
  userAgent: string;
  touch: number;
  place: Place;
  now: number;
}): string {
  return message(
    `<b>Descărcare · OneMarkk</b>\n${escapeHtml(input.email)}`,
    [
      section("De unde", [...locationLines(input.ip, input.place), `Sursă · ${escapeHtml(sourceLabel(input.referrer))}`]),
      section("Dispozitiv", deviceLines(input.userAgent, input.touch, input.screen, input.lang, input.tz)),
      section("Fișier", [escapeHtml(input.fileName)]),
    ],
    input.now,
  );
}

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim());
}

export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() ?? "";
  if (!token || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        chat_id: chatId,
        text: text.slice(0, 4000),
        parse_mode: "HTML",
        disable_web_page_preview: "1",
      }),
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
