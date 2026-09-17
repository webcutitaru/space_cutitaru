const DEFAULT_API_BASE = "https://space.cutitaru.com";
const STORAGE_KEYS = {
  apiBase: "reelSaveApiBase",
  lastResult: "reelSaveLastResult",
};

function normalizeApiBase(raw) {
  const trimmed = String(raw || "").trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_API_BASE;
}

async function getApiBase() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.apiBase);
  return normalizeApiBase(data[STORAGE_KEYS.apiBase]);
}

async function setApiBase(raw) {
  const apiBase = normalizeApiBase(raw);
  await chrome.storage.local.set({ [STORAGE_KEYS.apiBase]: apiBase });
  return apiBase;
}

function isSupportedVideoUrl(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "instagram.com" || host.endsWith(".instagram.com")) {
      return /\/(reel|reels|p|tv)\//i.test(url.pathname);
    }
    if (
      host === "tiktok.com" ||
      host.endsWith(".tiktok.com") ||
      host === "vm.tiktok.com" ||
      host === "vt.tiktok.com"
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isInstagramUrl(raw) {
  try {
    const host = new URL(String(raw || "").trim()).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
    return host === "instagram.com" || host.endsWith(".instagram.com");
  } catch {
    return false;
  }
}

async function getActiveTabUrl() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  return tab?.url || "";
}

/**
 * Collect Instagram cookies from the logged-in Chrome session.
 * Returns a Cookie header string, or "" if not logged in.
 */
async function getInstagramCookieHeader() {
  const cookies = await chrome.cookies.getAll({ domain: "instagram.com" });
  if (!Array.isArray(cookies) || cookies.length === 0) return "";

  const session = cookies.find((c) => c.name === "sessionid" && c.value);
  if (!session) return "";

  const prefer = new Set([
    "sessionid",
    "ds_user_id",
    "csrftoken",
    "mid",
    "ig_did",
    "rur",
    "datr",
  ]);
  const picked = cookies.filter((c) => prefer.has(c.name));
  const list = picked.length ? picked : cookies;
  return list.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function extractVideo(pageUrl) {
  if (!isSupportedVideoUrl(pageUrl)) {
    return {
      ok: false,
      error:
        "Only Instagram Reels/posts and TikTok video links are supported.",
    };
  }

  const apiBase = await getApiBase();
  const body = { pageUrl: pageUrl.trim() };

  if (isInstagramUrl(pageUrl)) {
    const cookies = await getInstagramCookieHeader();
    if (cookies) body.cookies = cookies;
  }

  const response = await fetch(`${apiBase}/api/reelsave/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      error: data.error || `Extract failed (${response.status}).`,
      needsLogin: /login|logged-in|cookies|session/i.test(
        String(data.error || ""),
      ),
    };
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.lastResult]: data });
  return {
    ok: true,
    result: data,
    apiBase,
    hasInstagramCookies: Boolean(body.cookies),
  };
}

async function downloadVideo({ pageUrl, formatId, filename, cookieTicket }) {
  if (!pageUrl || !formatId) {
    return { ok: false, error: "Missing download parameters." };
  }

  const apiBase = await getApiBase();
  const safeName = String(filename || "video.mp4").replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );

  const params = new URLSearchParams({
    pageUrl,
    formatId,
    filename: safeName,
  });
  if (cookieTicket) params.set("cookieTicket", cookieTicket);

  try {
    const downloadId = await chrome.downloads.download({
      url: `${apiBase}/api/reelsave/download?${params.toString()}`,
      filename: safeName,
      saveAs: true,
    });
    return { ok: true, downloadId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Download failed.",
    };
  }
}

function thumbnailUrl(apiBase, thumbnailUrl) {
  if (!thumbnailUrl) return null;
  return `${normalizeApiBase(apiBase)}/api/reelsave/thumbnail?url=${encodeURIComponent(thumbnailUrl)}`;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "GET_STATE") {
    Promise.all([getApiBase(), getActiveTabUrl()]).then(
      async ([apiBase, activeUrl]) => {
        const data = await chrome.storage.local.get(STORAGE_KEYS.lastResult);
        sendResponse({
          ok: true,
          apiBase,
          activeUrl,
          activeSupported: isSupportedVideoUrl(activeUrl),
          lastResult: data[STORAGE_KEYS.lastResult] || null,
        });
      },
    );
    return true;
  }

  if (message.type === "SET_API_BASE") {
    setApiBase(message.apiBase).then((apiBase) =>
      sendResponse({ ok: true, apiBase }),
    );
    return true;
  }

  if (message.type === "EXTRACT") {
    extractVideo(message.pageUrl).then(sendResponse);
    return true;
  }

  if (message.type === "DOWNLOAD") {
    downloadVideo({
      pageUrl: message.pageUrl,
      formatId: message.formatId,
      filename: message.filename,
      cookieTicket: message.cookieTicket,
    }).then(sendResponse);
    return true;
  }

  if (message.type === "THUMBNAIL_URL") {
    getApiBase().then((apiBase) => {
      sendResponse({
        ok: true,
        url: thumbnailUrl(apiBase, message.thumbnailUrl),
      });
    });
    return true;
  }

  if (message.type === "OPEN_APP") {
    getApiBase().then((apiBase) => {
      chrome.tabs.create({ url: `${apiBase}/reelsave` });
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === "CHECK_IG_COOKIES") {
    getInstagramCookieHeader().then((cookies) => {
      sendResponse({
        ok: true,
        loggedIn: Boolean(cookies),
      });
    });
    return true;
  }
});
