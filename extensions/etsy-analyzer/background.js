const DEFAULT_API_BASE = "https://space.cutitaru.com";
const MAX_SLOTS = 10;
const SEARCH_DELAY_MS = 1400;
const HYDRATE_MS = 2800;
const STORAGE_KEYS = {
  queue: "etsyAnalyzerQueue",
  apiBase: "etsyAnalyzerApiBase",
  lastResult: "etsyAnalyzerLastResult",
  handoffPending: "etsyAnalyzerHandoffPending",
  searchJob: "etsyAnalyzerSearchJob",
};

function normalizeApiBase(raw) {
  const trimmed = String(raw || "").trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_API_BASE;
}

function analyzeUrl(apiBase) {
  return `${normalizeApiBase(apiBase)}/api/etsy-analyzer/analyze`;
}

function appUrl(apiBase) {
  return `${normalizeApiBase(apiBase)}/etsy-analyzer`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getQueue() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.queue);
  return Array.isArray(data[STORAGE_KEYS.queue]) ? data[STORAGE_KEYS.queue] : [];
}

async function setQueue(queue) {
  await chrome.storage.local.set({ [STORAGE_KEYS.queue]: queue });
}

async function getApiBase() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.apiBase);
  return normalizeApiBase(data[STORAGE_KEYS.apiBase]);
}

async function setSearchJob(job) {
  await chrome.storage.local.set({ [STORAGE_KEYS.searchJob]: job });
  const badge =
    job?.status === "running" && job.step && job.total
      ? String(job.step)
      : "";
  try {
    await chrome.action.setBadgeText({ text: badge });
    await chrome.action.setBadgeBackgroundColor({ color: "#1a1a1a" });
  } catch {
    /* ignore */
  }
}

async function getSearchJob() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.searchJob);
  return data[STORAGE_KEYS.searchJob] || null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "GET_STATE") {
    Promise.all([getQueue(), getApiBase(), getSearchJob()]).then(
      ([queue, apiBase, searchJob]) => {
        sendResponse({
          ok: true,
          queue: summarizeQueue(queue),
          apiBase,
          searchJob,
        });
      },
    );
    return true;
  }

  if (message.type === "SET_API_BASE") {
    const apiBase = normalizeApiBase(message.apiBase);
    chrome.storage.local.set({ [STORAGE_KEYS.apiBase]: apiBase }).then(() => {
      sendResponse({ ok: true, apiBase });
    });
    return true;
  }

  if (message.type === "ADD_CURRENT") {
    addCurrentTab()
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Add failed.",
        }),
      );
    return true;
  }

  if (message.type === "ADD_FROM_SEARCH") {
    const limit = Math.min(
      MAX_SLOTS,
      Math.max(1, Number(message.limit) || MAX_SLOTS),
    );
    addFromSearch(limit)
      .then((result) => sendResponse(result))
      .catch(async (err) => {
        const error = err instanceof Error ? err.message : "Search add failed.";
        await setSearchJob({
          status: "error",
          message: error,
          at: Date.now(),
        });
        sendResponse({ ok: false, error });
      });
    return true;
  }

  if (message.type === "REMOVE_ITEM") {
    removeItem(message.id)
      .then((queue) => sendResponse({ ok: true, queue: summarizeQueue(queue) }))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Remove failed.",
        }),
      );
    return true;
  }

  if (message.type === "CLEAR_QUEUE") {
    setQueue([]).then(() => sendResponse({ ok: true, queue: [] }));
    return true;
  }

  if (message.type === "ANALYZE") {
    runAnalyze()
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Analyze failed.",
        }),
      );
    return true;
  }

  if (message.type === "OPEN_APP") {
    getApiBase().then((apiBase) => {
      chrome.tabs.create({ url: appUrl(apiBase) });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "SEND_TO_SITE") {
    sendToSite({ analyzeFirst: Boolean(message.analyzeFirst) })
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Send to site failed.",
        }),
      );
    return true;
  }

  if (message.type === "GET_HANDOFF_PAYLOAD") {
    getHandoffPayload()
      .then((payload) => sendResponse(payload))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === "HANDOFF_DELIVERED") {
    chrome.storage.local
      .set({ [STORAGE_KEYS.handoffPending]: false })
      .then(() => sendResponse({ ok: true }));
    return true;
  }
});

function summarizeQueue(queue) {
  return queue.map((item) => ({
    id: item.id,
    url: item.url,
    title: item.title,
    listingId: item.listingId,
    chars: item.html ? item.html.length : 0,
    addedAt: item.addedAt,
  }));
}

function listingIdFromUrl(url) {
  const m = String(url).match(/\/listing\/(\d+)/i);
  return m ? m[1] : undefined;
}

function isSearchLikeUrl(url) {
  try {
    const u = new URL(url);
    if (!/(^|\.)etsy\.com$/i.test(u.hostname)) return false;
    if (/\/listing\/\d+/i.test(u.pathname)) return false;
    return /\/(search|market|c)\b/i.test(u.pathname);
  } catch {
    return false;
  }
}

/** Injected into listing pages — must be self-contained. */
async function captureListingPageFn() {
  const url = location.href;
  const title = document.title || "";

  function hasTags(html) {
    return /"tags"\s*:\s*\[/.test(html || "") || /"tag_list"\s*:\s*\[/.test(html || "");
  }

  function score(html) {
    if (!html || html.length < 2000) return 0;
    let s = 0;
    // Tags in HTML always beat length-only pages (fetch may be lean without tags)
    if (hasTags(html)) s += 100;
    if (/__INITIAL_STATE__|__PRELOADED_STATE__|__NEXT_DATA__/i.test(html)) s += 5;
    if (/listing_id|"listingId"/i.test(html)) s += 2;
    s += Math.min(3, Math.floor(html.length / 200000));
    return s;
  }

  let fetched = "";
  try {
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "text/html" },
    });
    if (res.ok) fetched = await res.text();
  } catch {
    /* ignore */
  }

  const live = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

  const scriptBlocks = Array.from(document.querySelectorAll("script"))
    .map((el) => {
      const text = el.textContent || "";
      if (text.length < 80) return "";
      if (!/listing|tags|__INITIAL|__PRELOADED|__NEXT_DATA__|taxonom/i.test(text)) {
        return "";
      }
      const type = el.getAttribute("type");
      const typeAttr = type ? ` type="${type.replace(/"/g, "")}"` : "";
      const safe = text.replace(/<\/script/gi, "<\\/script");
      return `<script${typeAttr}>${safe}</script>`;
    })
    .filter(Boolean)
    .join("\n");

  const rebuilt =
    "<!DOCTYPE html><html><head><title>" +
    title.replace(/</g, "") +
    "</title></head><body>" +
    scriptBlocks +
    "\n<!-- etsy-analyzer: scripts-only fallback -->\n</body></html>";

  const candidates = [
    { name: "fetch", html: fetched },
    { name: "live", html: live },
    { name: "scripts", html: rebuilt },
  ];
  candidates.sort((a, b) => score(b.html) - score(a.html));
  const withTags = candidates.find((c) => hasTags(c.html));
  const best = withTags || candidates[0];

  return {
    url,
    title,
    html: best.html,
    capture: best.name,
    score: score(best.html),
    hasTagsHint: hasTags(best.html),
  };
}

/** Injected into search pages — must be self-contained. */
function collectSearchListingUrlsFn(max) {
  const seen = new Set();
  const out = [];
  const anchors = document.querySelectorAll('a[href*="/listing/"]');
  for (const a of anchors) {
    try {
      const href = a.href || a.getAttribute("href") || "";
      const u = new URL(href, location.origin);
      const m = u.pathname.match(/\/listing\/(\d+)/i);
      if (!m) continue;
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(`https://www.etsy.com/listing/${id}`);
      if (out.length >= max) break;
    } catch {
      /* ignore */
    }
  }
  return out;
}

async function captureListingInTab(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: captureListingPageFn,
  });
  return result;
}

async function enqueueCapture(result) {
  if (!result?.html || result.html.length < 500) {
    throw new Error("Page HTML looks empty — wait for the listing to finish loading.");
  }
  if (!result.hasTagsHint) {
    throw new Error("No SEO tags found in page HTML.");
  }

  const listingId = listingIdFromUrl(result.url);
  const queue = await getQueue();

  if (listingId && queue.some((q) => q.listingId === listingId)) {
    return {
      ok: true,
      duplicate: true,
      queue,
      error: `Listing ${listingId} is already in the queue.`,
    };
  }
  if (queue.length >= MAX_SLOTS) {
    throw new Error(`Queue full (max ${MAX_SLOTS}).`);
  }

  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: result.url,
    title: (result.title || "").slice(0, 160),
    listingId,
    html: result.html,
    addedAt: Date.now(),
    capture: result.capture,
  });
  await setQueue(queue);
  return { ok: true, queue, capture: result.capture };
}

async function addCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab.");
  }
  if (!/^https:\/\/(www\.)?etsy\.com\/listing\//i.test(tab.url)) {
    throw new Error("Open an Etsy listing page first (etsy.com/listing/…).");
  }

  const result = await captureListingInTab(tab.id);
  const enqueued = await enqueueCapture(result);
  return {
    ...enqueued,
    queue: summarizeQueue(enqueued.queue),
    hasTagsHint: result.hasTagsHint,
  };
}

async function addFromSearch(limit) {
  const job = await getSearchJob();
  if (job?.status === "running") {
    throw new Error("Search automation is already running.");
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab.");
  }
  if (!isSearchLikeUrl(tab.url)) {
    throw new Error(
      "Open an Etsy search / market results page first, then use this button.",
    );
  }

  const queue = await getQueue();
  const room = MAX_SLOTS - queue.length;
  if (room <= 0) {
    throw new Error(`Queue full (max ${MAX_SLOTS}). Clear some listings first.`);
  }

  const want = Math.min(limit, room);

  const [{ result: urls }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: collectSearchListingUrlsFn,
    args: [Math.min(40, want * 3)],
  });

  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error(
      "No listing links found on this page. Scroll the search results, then try again.",
    );
  }

  const existing = new Set(
    queue.map((q) => q.listingId).filter(Boolean),
  );
  const toOpen = urls
    .filter((u) => {
      const id = listingIdFromUrl(u);
      return id && !existing.has(id);
    })
    .slice(0, want);

  if (toOpen.length === 0) {
    throw new Error("All visible listings are already in the queue.");
  }

  await setSearchJob({
    status: "running",
    step: 0,
    total: toOpen.length,
    message: `Found ${toOpen.length} listing(s). Starting…`,
    at: Date.now(),
  });

  const errors = [];
  let added = 0;

  for (let i = 0; i < toOpen.length; i++) {
    const listingUrl = toOpen[i];
    const id = listingIdFromUrl(listingUrl);
    await setSearchJob({
      status: "running",
      step: i + 1,
      total: toOpen.length,
      message: `Opening #${id} (${i + 1}/${toOpen.length})…`,
      added,
      at: Date.now(),
    });

    let listingTab = null;
    try {
      listingTab = await chrome.tabs.create({
        url: listingUrl,
        active: false,
      });
      await waitTabComplete(listingTab.id, 50000);
      await sleep(HYDRATE_MS);

      const captured = await captureListingInTab(listingTab.id);
      const enqueued = await enqueueCapture(captured);
      if (enqueued.duplicate) {
        errors.push(`#${id}: already in queue`);
      } else {
        added += 1;
      }
    } catch (err) {
      errors.push(
        `#${id}: ${err instanceof Error ? err.message : "failed"}`,
      );
    } finally {
      if (listingTab?.id != null) {
        try {
          await chrome.tabs.remove(listingTab.id);
        } catch {
          /* ignore */
        }
      }
      if (i < toOpen.length - 1) {
        await sleep(SEARCH_DELAY_MS);
      }
    }
  }

  const finalQueue = await getQueue();
  const message =
    added > 0
      ? `Added ${added}/${toOpen.length} from search.`
      : `Could not add listings (${errors[0] || "unknown error"}).`;

  await setSearchJob({
    status: added > 0 ? "done" : "error",
    step: toOpen.length,
    total: toOpen.length,
    added,
    message,
    errors: errors.slice(0, 8),
    at: Date.now(),
  });

  return {
    ok: added > 0,
    added,
    attempted: toOpen.length,
    errors,
    queue: summarizeQueue(finalQueue),
    error: added > 0 ? undefined : message,
  };
}

async function removeItem(id) {
  const queue = await getQueue();
  const next = queue.filter((q) => q.id !== id);
  await setQueue(next);
  return next;
}

async function runAnalyze() {
  const queue = await getQueue();
  if (queue.length === 0) {
    throw new Error("Queue is empty. Add at least one listing.");
  }

  const apiBase = await getApiBase();
  const htmls = queue.map((q) => q.html);

  const response = await fetch(analyzeUrl(apiBase), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ htmls }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `API ${response.status}`,
    );
  }

  const result = {
    at: Date.now(),
    apiBase,
    warnings: data.warnings,
    insight: data.insight,
    queueSummary: summarizeQueue(queue),
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.lastResult]: result });

  return {
    ok: true,
    warnings: data.warnings,
    insight: summarizeInsight(data.insight),
    fullInsight: data.insight,
    appUrl: appUrl(apiBase),
  };
}

async function getHandoffPayload() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.handoffPending,
    STORAGE_KEYS.queue,
    STORAGE_KEYS.lastResult,
  ]);
  if (!data[STORAGE_KEYS.handoffPending]) {
    return { ok: false };
  }
  const queue = Array.isArray(data[STORAGE_KEYS.queue])
    ? data[STORAGE_KEYS.queue]
    : [];
  if (queue.length === 0) {
    return { ok: false };
  }
  const last = data[STORAGE_KEYS.lastResult] || null;
  return {
    ok: true,
    htmls: queue.map((q) => q.html),
    titles: queue.map((q) => q.title || ""),
    insight: last?.insight ?? null,
    warnings: last?.warnings ?? null,
  };
}

function appUrlPattern(apiBase) {
  const base = normalizeApiBase(apiBase);
  try {
    const u = new URL(base);
    return `${u.origin}/etsy-analyzer*`;
  } catch {
    return "https://space.cutitaru.com/etsy-analyzer*";
  }
}

async function findAppTab(apiBase) {
  const pattern = appUrlPattern(apiBase);
  const tabs = await chrome.tabs.query({ url: pattern });
  return tabs.find((t) => t.id != null) || null;
}

function waitTabComplete(tabId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Timed out waiting for the page."));
    }, timeoutMs);

    function onUpdated(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }

    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
        return;
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
    });
  });
}

async function pingHandoff(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { type: "TRY_HANDOFF" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["bridge.js"],
    });
    return chrome.tabs.sendMessage(tabId, { type: "TRY_HANDOFF" });
  }
}

async function sendToSite({ analyzeFirst = false } = {}) {
  const queue = await getQueue();
  if (queue.length === 0) {
    throw new Error("Queue is empty. Add at least one listing.");
  }

  let analyzeResult = null;
  if (analyzeFirst) {
    analyzeResult = await runAnalyze();
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.handoffPending]: true });

  const apiBase = await getApiBase();
  let tab = await findAppTab(apiBase);
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { active: true });
  } else {
    tab = await chrome.tabs.create({ url: appUrl(apiBase), active: true });
  }

  if (!tab?.id) {
    throw new Error("Could not open the analyzer page.");
  }

  await waitTabComplete(tab.id);
  await sleep(500);
  await pingHandoff(tab.id);

  return {
    ok: true,
    delivered: true,
    count: queue.length,
    warnings: analyzeResult?.warnings,
    insight: analyzeResult?.insight,
    appUrl: appUrl(apiBase),
  };
}

function summarizeInsight(insight) {
  if (!insight || typeof insight !== "object") return null;
  const topTags = Array.isArray(insight.tagFrequency)
    ? insight.tagFrequency.slice(0, 8).map((t) => ({
        phrase: t.phrase,
        count: t.count,
        total: t.total,
      }))
    : [];
  const reportCount = Array.isArray(insight.reports)
    ? insight.reports.length
    : 0;
  const without = insight.listingsWithoutTags ?? 0;
  return {
    headline: insight.headline || "",
    plainBullets: Array.isArray(insight.plainBullets)
      ? insight.plainBullets.slice(0, 3)
      : [],
    listingsWithoutTags: without,
    listingsWithTags: Math.max(0, reportCount - without),
    usableAsReference: insight.usableAsReference,
    topTags,
    reportCount,
  };
}
