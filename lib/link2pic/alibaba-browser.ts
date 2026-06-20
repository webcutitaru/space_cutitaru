import { chromium, type Browser } from "playwright-core";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const DETAIL_DATA_TIMEOUT_MS = 45_000;
const PAGE_LOAD_TIMEOUT_MS = 60_000;

let sharedBrowser: Browser | undefined;
let sharedBrowserPromise: Promise<Browser> | undefined;

function useHeadlessBrowser(): boolean {
  return process.env.LINK2PIC_ALIBABA_HEADLESS === "true";
}

function browserChannel(): "chrome" | undefined {
  if (process.env.LINK2PIC_ALIBABA_BROWSER_CHANNEL === "none") return undefined;
  return "chrome";
}

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser?.isConnected()) return sharedBrowser;

  if (!sharedBrowserPromise) {
    sharedBrowserPromise = chromium
      .launch({
        headless: useHeadlessBrowser(),
        channel: browserChannel(),
        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-dev-shm-usage",
        ],
      })
      .then((browser) => {
        sharedBrowser = browser;
        return browser;
      })
      .catch((error) => {
        sharedBrowserPromise = undefined;
        throw error;
      });
  }

  return sharedBrowserPromise;
}

export async function fetchAlibabaPageHtml(pageUrl: string): Promise<string> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  try {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    const page = await context.newPage();
    await page.goto(pageUrl, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_LOAD_TIMEOUT_MS,
    });

    try {
      await page.waitForFunction(
        () =>
          typeof (window as unknown as { detailData?: unknown }).detailData ===
          "object",
        undefined,
        { timeout: DETAIL_DATA_TIMEOUT_MS },
      );
    } catch {
      /* captcha or slow page — return whatever HTML we got */
    }

    return page.content();
  } finally {
    await context.close();
  }
}

export async function closeAlibabaBrowser(): Promise<void> {
  if (!sharedBrowser) return;
  await sharedBrowser.close();
  sharedBrowser = undefined;
  sharedBrowserPromise = undefined;
}
