const $ = (id) => document.getElementById(id);

const apiBaseInput = $("apiBase");
const addBtn = $("addBtn");
const searchBtn = $("searchBtn");
const searchLimit = $("searchLimit");
const analyzeBtn = $("analyzeBtn");
const clearBtn = $("clearBtn");
const openAppBtn = $("openAppBtn");
const fullReportBtn = $("fullReportBtn");
const statusEl = $("status");
const queueEl = $("queue");
const queueCount = $("queueCount");
const resultSection = $("resultSection");
const headlineEl = $("headline");
const metaLine = $("metaLine");
const bulletsEl = $("bullets");
const barsEl = $("bars");
const warningsEl = $("warnings");

let pollTimer = null;
let lastInsight = null;

function setStatus(text, kind) {
  statusEl.textContent = text || "";
  statusEl.className = "status" + (kind ? ` ${kind}` : "");
}

function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function setBusy(busy) {
  addBtn.disabled = busy;
  searchBtn.disabled = busy;
  analyzeBtn.disabled = busy;
  clearBtn.disabled = busy;
  searchLimit.disabled = busy;
  if (fullReportBtn) fullReportBtn.disabled = busy;
}

function renderQueue(queue) {
  queueCount.textContent = `(${queue.length})`;
  queueEl.innerHTML = "";
  if (!queue.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent =
      "No listings yet. Add a product tab, or use Add from search.";
    queueEl.appendChild(p);
    return;
  }

  for (const item of queue) {
    const li = document.createElement("li");
    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = item.title || item.listingId || "Listing";
    title.title = item.title || "";

    const url = document.createElement("div");
    url.className = "url";
    url.textContent = item.listingId
      ? `#${item.listingId} · ${(item.chars / 1024).toFixed(0)} KB`
      : item.url;

    meta.appendChild(title);
    meta.appendChild(url);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove ghost";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      const res = await send("REMOVE_ITEM", { id: item.id });
      if (res?.ok) renderQueue(res.queue || []);
    });

    li.appendChild(meta);
    li.appendChild(remove);
    queueEl.appendChild(li);
  }
}

function renderResult(insight, warnings) {
  lastInsight = insight;
  if (!insight) {
    resultSection.classList.add("hidden");
    return;
  }
  resultSection.classList.remove("hidden");
  headlineEl.textContent = insight.headline || "Analysis complete.";

  const withTags = insight.listingsWithTags ?? insight.reportCount ?? 0;
  const total = insight.reportCount ?? 0;
  metaLine.textContent = `${total} listing(s) · ${withTags} with SEO tags`;

  bulletsEl.innerHTML = "";
  for (const b of insight.plainBullets || []) {
    const li = document.createElement("li");
    li.textContent = b;
    bulletsEl.appendChild(li);
  }

  barsEl.innerHTML = "";
  const tags = insight.topTags || [];
  const maxCount = Math.max(...tags.map((t) => t.count), 1);
  for (const t of tags) {
    const row = document.createElement("div");
    row.className = "bar-row";
    const label = document.createElement("div");
    label.className = "bar-label";
    label.innerHTML = `<span>${escapeHtml(t.phrase)}</span><span class="bar-count">${t.count}/${t.total}</span>`;
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${Math.max(8, Math.round((t.count / maxCount) * 100))}%`;
    track.appendChild(fill);
    row.appendChild(label);
    row.appendChild(track);
    barsEl.appendChild(row);
  }

  if (Array.isArray(warnings) && warnings.length) {
    warningsEl.textContent = warnings.join(" · ");
  } else if (
    insight.listingsWithoutTags > 0 &&
    insight.listingsWithoutTags === insight.reportCount
  ) {
    warningsEl.textContent =
      "No SEO tags found — recapture product pages (not search).";
  } else if (insight.listingsWithoutTags > 0) {
    warningsEl.textContent = `${insight.listingsWithoutTags}/${insight.reportCount} without SEO tags (others OK).`;
  } else {
    warningsEl.textContent = "";
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applySearchJob(job) {
  if (!job) return false;
  if (job.status === "running") {
    setBusy(true);
    const prog =
      job.step && job.total ? ` ${job.step}/${job.total}` : "";
    setStatus((job.message || "Running search automation…") + prog);
    return true;
  }
  if (job.status === "done") {
    setBusy(false);
    const extra =
      Array.isArray(job.errors) && job.errors.length
        ? ` · ${job.errors.length} skip/error(s)`
        : "";
    setStatus((job.message || "Search done.") + extra, "ok");
    return false;
  }
  if (job.status === "error") {
    setBusy(false);
    setStatus(job.message || "Search failed.", "err");
    return false;
  }
  return false;
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(async () => {
    const res = await send("GET_STATE");
    if (!res?.ok) return;
    renderQueue(res.queue || []);
    const running = applySearchJob(res.searchJob);
    if (!running) stopPoll();
  }, 900);
}

async function refresh() {
  const res = await send("GET_STATE");
  if (!res?.ok) {
    setStatus(res?.error || "Could not load state.", "err");
    return;
  }
  apiBaseInput.value = res.apiBase || "";
  renderQueue(res.queue || []);
  if (applySearchJob(res.searchJob)) startPoll();
}

apiBaseInput.addEventListener("change", async () => {
  const res = await send("SET_API_BASE", { apiBase: apiBaseInput.value });
  if (res?.ok) {
    apiBaseInput.value = res.apiBase;
    setStatus(`API: ${res.apiBase}`, "ok");
  }
});

addBtn.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Capturing page…");
  try {
    const res = await send("ADD_CURRENT");
    if (!res?.ok) {
      setStatus(res?.error || "Add failed.", "err");
      return;
    }
    renderQueue(res.queue || []);
    setStatus(
      res.duplicate
        ? res.error
        : `Added (${res.capture || "html"}). Queue: ${res.queue.length}/10`,
      res.duplicate ? "err" : "ok",
    );
  } finally {
    setBusy(false);
  }
});

searchBtn.addEventListener("click", async () => {
  setBusy(true);
  setStatus("Collecting links from search…");
  startPoll();
  try {
    const limit = Number(searchLimit.value) || 10;
    const res = await send("ADD_FROM_SEARCH", { limit });
    const state = await send("GET_STATE");
    if (state?.ok) renderQueue(state.queue || []);

    if (!res?.ok) {
      setStatus(res?.error || "Search add failed.", "err");
      return;
    }
    const errN = Array.isArray(res.errors) ? res.errors.length : 0;
    setStatus(
      `Added ${res.added}/${res.attempted} from search` +
        (errN ? ` · ${errN} issue(s)` : "") +
        `. Queue: ${res.queue.length}/10`,
      "ok",
    );
  } finally {
    stopPoll();
    setBusy(false);
  }
});

clearBtn.addEventListener("click", async () => {
  const res = await send("CLEAR_QUEUE");
  if (res?.ok) {
    renderQueue([]);
    resultSection.classList.add("hidden");
    lastInsight = null;
    setStatus("Queue cleared.");
  }
});

openAppBtn.addEventListener("click", () => send("OPEN_APP"));

async function runAnalyzeAndMaybeSend(sendToSite) {
  setBusy(true);
  setStatus(sendToSite ? "Analyzing + opening full report…" : "Analyzing…");
  try {
    if (apiBaseInput.value.trim()) {
      await send("SET_API_BASE", { apiBase: apiBaseInput.value });
    }
    if (sendToSite) {
      const res = await send("SEND_TO_SITE", { analyzeFirst: true });
      if (!res?.ok) {
        setStatus(res?.error || "Failed.", "err");
        resultSection.classList.add("hidden");
        return;
      }
      renderResult(res.insight, res.warnings);
      setStatus(
        `Full report opened · ${res.insight?.reportCount ?? res.count} listing(s).`,
        "ok",
      );
      return;
    }

    const res = await send("ANALYZE");
    if (!res?.ok) {
      setStatus(res?.error || "Analyze failed.", "err");
      resultSection.classList.add("hidden");
      return;
    }
    renderResult(res.insight, res.warnings);
    setStatus(`Done · ${res.insight?.reportCount ?? "?"} listing(s).`, "ok");
  } finally {
    setBusy(false);
  }
}

analyzeBtn.addEventListener("click", () => runAnalyzeAndMaybeSend(false));
fullReportBtn.addEventListener("click", () => runAnalyzeAndMaybeSend(true));

refresh();
