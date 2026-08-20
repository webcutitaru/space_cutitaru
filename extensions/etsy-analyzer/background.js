const DEFAULT_API_BASE = "https://space.cutitaru.com";
const MAX_SLOTS = 10;
const STORAGE_KEYS = {
  queue: "etsyAnalyzerQueue",
  apiBase: "etsyAnalyzerApiBase",
  lastResult: "etsyAnalyzerLastResult",
  handoffPending: "etsyAnalyzerHandoffPending",
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "GET_STATE") {
    Promise.all([getQueue(), getApiBase()]).then(([queue, apiBase]) => {
      sendResponse({ ok: true, queue: summarizeQueue(queue), apiBase });
    });
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

async function addCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("No active tab.");
  }
  if (!/^https:\/\/(www\.)?etsy\.com\/listing\//i.test(tab.url)) {
    throw new Error("Open an Etsy listing page first (etsy.com/listing/…).");
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      url: location.href,
      title: document.title || "",
      html: document.documentElement.outerHTML,
    }),
  });

  if (!result?.html || result.html.length < 500) {
    throw new Error("Page HTML looks empty — wait for the listing to finish loading.");
  }

  const listingId = listingIdFromUrl(result.url);
  const queue = await getQueue();

  if (listingId && queue.some((q) => q.listingId === listingId)) {
    return {
      ok: true,
      duplicate: true,
      queue: summarizeQueue(queue),
      error: `Listing ${listingId} is already in the queue.`,
    };
  }
  if (queue.length >= MAX_SLOTS) {
    throw new Error(`Queue full (max ${MAX_SLOTS}). Remove one before adding.`);
  }

  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: result.url,
    title: result.title.slice(0, 160),
    listingId,
    html: result.html,
    addedAt: Date.now(),
  });
  await setQueue(queue);

  return { ok: true, queue: summarizeQueue(queue) };
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
      reject(new Error("Timed out waiting for the analyzer page."));
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
  // Give React a moment to mount
  await new Promise((r) => setTimeout(r, 500));
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
  const groups = Array.isArray(insight.frequencyGroups)
    ? insight.frequencyGroups.slice(0, 6).map((g) => ({
        label: `${g.count}/${g.total}`,
        count: Array.isArray(g.phrases) ? g.phrases.length : 0,
        sample: (g.phrases || []).slice(0, 5),
      }))
    : [];
  const topTags = Array.isArray(insight.tagFrequency)
    ? insight.tagFrequency.slice(0, 12).map((t) => ({
        phrase: t.phrase,
        count: t.count,
        total: t.total,
      }))
    : [];
  return {
    headline: insight.headline || "",
    plainBullets: Array.isArray(insight.plainBullets)
      ? insight.plainBullets.slice(0, 6)
      : [],
    listingsWithoutTags: insight.listingsWithoutTags ?? 0,
    usableAsReference: insight.usableAsReference,
    topTags,
    groups,
    reportCount: Array.isArray(insight.reports) ? insight.reports.length : 0,
  };
}
