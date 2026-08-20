const $ = (id) => document.getElementById(id);

const apiBaseInput = $("apiBase");
const addBtn = $("addBtn");
const analyzeBtn = $("analyzeBtn");
const sendBtn = $("sendBtn");
const clearBtn = $("clearBtn");
const openAppBtn = $("openAppBtn");
const statusEl = $("status");
const queueEl = $("queue");
const queueCount = $("queueCount");
const resultSection = $("resultSection");
const headlineEl = $("headline");
const bulletsEl = $("bullets");
const tagsEl = $("tags");
const warningsEl = $("warnings");

function setStatus(text, kind) {
  statusEl.textContent = text || "";
  statusEl.className = "status" + (kind ? ` ${kind}` : "");
}

function send(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, ...payload });
}

function renderQueue(queue) {
  queueCount.textContent = `(${queue.length})`;
  queueEl.innerHTML = "";
  if (!queue.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No listings yet. Open an Etsy product page and click Add.";
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
  if (!insight) {
    resultSection.classList.add("hidden");
    return;
  }
  resultSection.classList.remove("hidden");
  headlineEl.textContent = insight.headline || "Analysis complete.";

  bulletsEl.innerHTML = "";
  for (const b of insight.plainBullets || []) {
    const li = document.createElement("li");
    li.textContent = b;
    bulletsEl.appendChild(li);
  }

  tagsEl.innerHTML = "";
  for (const t of insight.topTags || []) {
    const span = document.createElement("span");
    span.className = "tag";
    const total = t.total != null ? t.total : "?";
    span.textContent = `${t.phrase} (${t.count}/${total})`;
    tagsEl.appendChild(span);
  }

  warningsEl.textContent = Array.isArray(warnings) && warnings.length
    ? warnings.join(" · ")
    : insight.listingsWithoutTags
      ? `${insight.listingsWithoutTags} listing(s) without SEO tags.`
      : "";
}

async function refresh() {
  const res = await send("GET_STATE");
  if (!res?.ok) {
    setStatus(res?.error || "Could not load state.", "err");
    return;
  }
  apiBaseInput.value = res.apiBase || "";
  renderQueue(res.queue || []);
}

apiBaseInput.addEventListener("change", async () => {
  const res = await send("SET_API_BASE", { apiBase: apiBaseInput.value });
  if (res?.ok) {
    apiBaseInput.value = res.apiBase;
    setStatus(`API: ${res.apiBase}`, "ok");
  }
});

addBtn.addEventListener("click", async () => {
  addBtn.disabled = true;
  setStatus("Capturing page…");
  try {
    const res = await send("ADD_CURRENT");
    if (!res?.ok) {
      setStatus(res?.error || "Add failed.", "err");
      return;
    }
    renderQueue(res.queue || []);
    setStatus(
      res.duplicate ? res.error : `Added. Queue: ${res.queue.length}/10`,
      res.duplicate ? "err" : "ok",
    );
  } finally {
    addBtn.disabled = false;
  }
});

clearBtn.addEventListener("click", async () => {
  const res = await send("CLEAR_QUEUE");
  if (res?.ok) {
    renderQueue([]);
    resultSection.classList.add("hidden");
    setStatus("Queue cleared.");
  }
});

openAppBtn.addEventListener("click", () => send("OPEN_APP"));

sendBtn.addEventListener("click", async () => {
  sendBtn.disabled = true;
  analyzeBtn.disabled = true;
  setStatus("Sending queue to the web app…");
  try {
    if (apiBaseInput.value.trim()) {
      await send("SET_API_BASE", { apiBase: apiBaseInput.value });
    }
    const res = await send("SEND_TO_SITE", { analyzeFirst: false });
    if (!res?.ok) {
      setStatus(res?.error || "Send failed.", "err");
      return;
    }
    setStatus(`Sent ${res.count} listing(s) to the site.`, "ok");
  } finally {
    sendBtn.disabled = false;
    analyzeBtn.disabled = false;
  }
});

analyzeBtn.addEventListener("click", async () => {
  analyzeBtn.disabled = true;
  addBtn.disabled = true;
  sendBtn.disabled = true;
  setStatus("Analyzing + sending to site…");
  try {
    if (apiBaseInput.value.trim()) {
      await send("SET_API_BASE", { apiBase: apiBaseInput.value });
    }
    const res = await send("SEND_TO_SITE", { analyzeFirst: true });
    if (!res?.ok) {
      setStatus(res?.error || "Analyze failed.", "err");
      resultSection.classList.add("hidden");
      return;
    }
    renderResult(res.insight, res.warnings);
    const n = res.insight?.reportCount ?? res.count ?? "?";
    setStatus(`Done · ${n} listing(s) on the site.`, "ok");
  } finally {
    analyzeBtn.disabled = false;
    addBtn.disabled = false;
    sendBtn.disabled = false;
  }
});

refresh();
