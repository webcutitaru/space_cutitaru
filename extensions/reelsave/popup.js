const $ = (id) => document.getElementById(id);

const apiBaseInput = $("apiBase");
const pageUrlInput = $("pageUrl");
const useTabBtn = $("useTabBtn");
const extractBtn = $("extractBtn");
const openAppBtn = $("openAppBtn");
const downloadBtn = $("downloadBtn");
const statusEl = $("status");
const igHint = $("igHint");
const resultSection = $("resultSection");
const thumbEl = $("thumb");
const uploaderEl = $("uploader");
const titleEl = $("title");
const statsEl = $("stats");
const warningsEl = $("warnings");

let lastResult = null;

function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function setStatus(text, kind) {
  statusEl.textContent = text || "";
  statusEl.className = "status" + (kind ? ` ${kind}` : "");
}

function setBusy(busy) {
  extractBtn.disabled = busy;
  useTabBtn.disabled = busy;
  downloadBtn.disabled = busy;
  openAppBtn.disabled = busy;
}

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatResolution(width, height) {
  if (!width || !height) return "—";
  return `${width}×${height}`;
}

function platformLabel(platform) {
  return platform === "instagram" ? "Instagram" : "TikTok";
}

async function renderResult(result) {
  lastResult = result;
  if (!result) {
    resultSection.classList.add("hidden");
    return;
  }

  resultSection.classList.remove("hidden");
  uploaderEl.textContent = result.uploader || platformLabel(result.platform);
  titleEl.textContent = result.title || "Untitled video";
  statsEl.textContent = [
    platformLabel(result.platform),
    formatDuration(result.durationSec),
    formatResolution(result.width, result.height),
    (result.ext || "mp4").toUpperCase(),
  ].join(" · ");

  warningsEl.textContent = Array.isArray(result.warnings)
    ? result.warnings.join(" · ")
    : "";

  downloadBtn.textContent = `Download ${(result.ext || "mp4").toUpperCase()}`;

  if (result.thumbnailUrl) {
    const thumbRes = await send("THUMBNAIL_URL", {
      thumbnailUrl: result.thumbnailUrl,
    });
    if (thumbRes?.url) {
      thumbEl.src = thumbRes.url;
      thumbEl.classList.remove("hidden");
    } else {
      thumbEl.classList.add("hidden");
    }
  } else {
    thumbEl.removeAttribute("src");
    thumbEl.classList.add("hidden");
  }
}

async function refreshIgHint() {
  const res = await send("CHECK_IG_COOKIES");
  if (res?.loggedIn) {
    igHint.classList.add("hidden");
    igHint.textContent = "";
  } else {
    igHint.classList.remove("hidden");
    igHint.textContent =
      "Instagram: log in in this browser so Reels that need a session can download.";
  }
}

async function refresh() {
  const res = await send("GET_STATE");
  if (!res?.ok) {
    setStatus(res?.error || "Could not load state.", "err");
    return;
  }
  apiBaseInput.value = res.apiBase || "";
  if (res.activeSupported && res.activeUrl) {
    pageUrlInput.value = res.activeUrl;
  }
  if (res.lastResult) {
    await renderResult(res.lastResult);
  }
  await refreshIgHint();
}

apiBaseInput.addEventListener("change", async () => {
  const res = await send("SET_API_BASE", { apiBase: apiBaseInput.value });
  if (res?.ok) {
    apiBaseInput.value = res.apiBase;
    setStatus(`API: ${res.apiBase}`, "ok");
  }
});

useTabBtn.addEventListener("click", async () => {
  const res = await send("GET_STATE");
  if (!res?.ok) {
    setStatus(res?.error || "Could not read tab.", "err");
    return;
  }
  if (!res.activeSupported) {
    setStatus("Current tab is not an Instagram/TikTok video URL.", "err");
    return;
  }
  pageUrlInput.value = res.activeUrl;
  setStatus("Using current tab URL.", "ok");
});

extractBtn.addEventListener("click", async () => {
  const pageUrl = pageUrlInput.value.trim();
  if (!pageUrl) {
    setStatus("Paste a video URL first.", "err");
    return;
  }

  setBusy(true);
  setStatus("Fetching video…");
  resultSection.classList.add("hidden");

  try {
    if (apiBaseInput.value.trim()) {
      await send("SET_API_BASE", { apiBase: apiBaseInput.value });
    }
    const res = await send("EXTRACT", { pageUrl });
    if (!res?.ok) {
      setStatus(res?.error || "Extract failed.", "err");
      if (res?.needsLogin) {
        igHint.classList.remove("hidden");
        igHint.textContent =
          "Log in to Instagram in Chrome, reload the Reel, then try again.";
      }
      return;
    }
    await renderResult(res.result);
    const cookieNote =
      res.result.platform === "instagram" && !res.hasInstagramCookies
        ? " · no IG session cookies"
        : "";
    setStatus(
      `Ready · ${res.result.meta?.durationMs ?? "?"}ms${cookieNote}`,
      "ok",
    );
  } finally {
    setBusy(false);
  }
});

downloadBtn.addEventListener("click", async () => {
  if (!lastResult) return;
  setBusy(true);
  setStatus("Downloading…");
  try {
    const res = await send("DOWNLOAD", {
      pageUrl: lastResult.pageUrl,
      formatId: lastResult.formatId,
      filename: lastResult.filename,
      cookieTicket: lastResult.cookieTicket,
    });
    if (!res?.ok) {
      setStatus(res?.error || "Download failed.", "err");
      if (res?.needsLogin) {
        igHint.classList.remove("hidden");
        igHint.textContent =
          "Log in to Instagram in Chrome, reload the Reel, then try again.";
      }
      return;
    }
    setStatus("Download started.", "ok");
  } finally {
    setBusy(false);
  }
});

openAppBtn.addEventListener("click", () => send("OPEN_APP"));

refresh();
