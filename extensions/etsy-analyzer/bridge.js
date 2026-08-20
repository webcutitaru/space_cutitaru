/**
 * Runs on Space /etsy-analyzer pages.
 * Pulls queue HTML (+ optional insight) from the extension and posts it to the page.
 */
const PAGE_SOURCE = "etsy-analyzer-extension";
const APP_SOURCE = "etsy-analyzer-app";

async function tryHandoff() {
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_HANDOFF_PAYLOAD" });
    if (!res?.ok || !Array.isArray(res.htmls) || res.htmls.length === 0) {
      return { ok: false };
    }

    window.postMessage(
      {
        source: PAGE_SOURCE,
        type: "HANDOFF",
        htmls: res.htmls,
        titles: res.titles || [],
        insight: res.insight ?? null,
        warnings: res.warnings ?? null,
      },
      "*",
    );

    await chrome.runtime.sendMessage({ type: "HANDOFF_DELIVERED" });
    return { ok: true, count: res.htmls.length };
  } catch {
    return { ok: false };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TRY_HANDOFF") {
    tryHandoff().then(sendResponse);
    return true;
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (data?.source === APP_SOURCE && data.type === "READY") {
    tryHandoff();
  }
});

// React may mount slightly after the content script
setTimeout(() => {
  tryHandoff();
}, 600);
