# Etsy Analyzer — Chrome extension (local)

Captures open Etsy listing pages and sends HTML to Space’s analyzer API / web UI.

## Install (Load unpacked)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder
4. After updates: click **Reload** on the extension card

## Use

1. Open 1–10 Etsy **product** tabs (`etsy.com/listing/…`)
2. Popup → **Add current listing** on each
3. API base: `https://space.cutitaru.com` (or `http://localhost:3000` / `:3001`)
4. **Analyze + send** — runs the API, then fills `/etsy-analyzer` (slots + insight)
5. **Send to site** — only fills the HTML slots on the web app (no new API call)

The web app must include the handoff listener (deployed Space or local Next). Reload the extension after pulling these files.

## Notes

- Max 10 listings
- Duplicate listing IDs are skipped
- Large HTML batches can take a few seconds
