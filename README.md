# SPACE by cutitaru

Platform for SaaS tools and mini projects.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Motion (`motion/react`)
- Node.js API routes for review extraction

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production build

```bash
npm run build
npm start
```

The app listens on port **3001** in production (`npm start`).

## VPS deploy (Node + PM2 + nginx)

1. Clone the repo on the VPS and install dependencies:

```bash
git clone https://github.com/webcutitaru/space_cutitaru.git
cd space_cutitaru
npm ci
npm run build
```

2. Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
```

3. Copy and enable nginx config:

```bash
sudo cp deploy/nginx-space.conf.example /etc/nginx/sites-available/space.cutitaru.com
sudo ln -s /etc/nginx/sites-available/space.cutitaru.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

4. Add SSL with Certbot:

```bash
sudo certbot --nginx -d space.cutitaru.com
```

5. Point DNS: `space.cutitaru.com` A record → VPS IP.

## Routes

| Path | Description |
|------|-------------|
| `/` | SPACE home — animated landing |
| `/reviews-extractor` | Shopify reviews extractor SaaS |
| `/image-converter` | JPEG/PNG → WebP converter (hybrid client preview + server export) |
| `/link2pic` | Extract and download images from product page URLs |
| `/reelsave` | Download Instagram Reels and TikTok videos without watermark |
| `/api/reviews/extract` | POST API for review extraction |
| `/api/image-convert/export` | POST multipart API for HQ WebP export |
| `/api/link2pic/extract` | POST API for image URL extraction |
| `/api/link2pic/proxy` | GET proxy for CORS-safe image download |
| `/api/link2pic/meta` | GET image metadata (size, dimensions) |
| `/api/reelsave/extract` | POST API for Instagram/TikTok video metadata |
| `/api/reelsave/download` | GET stream video download |
| `/api/reelsave/thumbnail` | GET thumbnail proxy |

## Reviews Extractor

POST `/api/reviews/extract` with JSON body:

```json
{ "storeUrl": "https://your-store.com" }
```

Returns aggregated reviews with provider metadata. Supported providers:

- **Judge.me** — public widget API
- **Trustoo** — Shopify app proxy (`/apps/trustoo/...`)
- **Loox** — storefront API
- **Air Reviews** — app proxy
- **Yotpo** — widget CDN API
- **Stamped.io** — widget API
- **Okendo** — storefront REST API
- **HTML fallback** — theme widgets and custom blocks

Accepts store URL or product URL (product URL is prioritized for faster extraction).

Limits in v1:

- Max 50 products per run
- Public storefront reviews only
- Some stores may block automated access

## Image Converter

Route: `/image-converter`

Hybrid flow:

1. **Preview** — browser Canvas converts JPEG/PNG → WebP instantly (files stay local)
2. **Quick save** — download preview blob without upload
3. **Export HQ** — POST `/api/image-convert/export` with Sharp for final WebP

Presets: `smaller` (72 / 1200px), `balanced` (85 / 1800px), `higher` (92 / 2400px).

Limits:

- JPEG and PNG only
- Max 20 MB per file

## Link2Pic

Route: `/link2pic`

Public UI copy is platform-agnostic (“paste a link, check availability, download images”). Backend still auto-detects Shopify, Alibaba, and generic pages.

Paste a product or listing URL (Shopify, Alibaba, or generic). Returns **product gallery images** plus **other images found on the page** (description, specs) in separate sections, with name, dimensions, file size, click-to-zoom preview, individual download, and ZIP export.

POST `/api/link2pic/extract` with JSON body:

```json
{ "pageUrl": "https://your-store.com/products/handle" }
```

GET `/api/link2pic/proxy?url=` — server proxy for cross-origin image download.

GET `/api/link2pic/meta?url=` — HEAD/probe metadata (size, dimensions).

Filtering in v1:

- Removes icons, logos, payment badges, avatars, and UI assets
- Shopify: product gallery only (`.json` order preserved)
- Generic: JSON-LD Product, og:image, scoped product selectors (not full-page scrape)
- Alibaba: allowlist for `/kf/`, `/ibank/`, `/imgextra/`, `_!!`, `O1CN…`; blocks banners, `/tps/` icons and tiny thumbs; parses `-tps-W-H` dimensions; does not apply Shopify URL transforms to alicdn links
- Minimum ~200×200 effective area when dimensions are known
- **Alibaba captcha fallback:** when Alibaba serves a bot-check (Baxia) page, Link2Pic first tries **Google Chrome via Playwright** to read `window.detailData.globalData.product.mediaItems` (full gallery). If the browser is unavailable, it falls back to the main image from `window._config_.customImage`
- **Alibaba browser mode:** requires Chrome installed. Default: enabled when captcha/no gallery is detected. Set `LINK2PIC_ALIBABA_BROWSER=0` to disable. On Linux VPS without a display, run the app under `xvfb-run` (headed Chrome). `LINK2PIC_ALIBABA_HEADLESS=true` forces headless mode (often still blocked by Alibaba)

Supported platforms:

- **Shopify** — `/products/{handle}.json` + gallery HTML fallback
- **Alibaba / 1688** — `window.detailData` gallery via Playwright + Chrome when needed, HTML/alicdn fallback
- **Generic** — Product JSON-LD, og:image, scoped product selectors

Limits:

- Max 80 product images per run
- Max 15 MB per image download
- Public pages only; bot-protected sites may fail

## ReelSave

Route: `/reelsave`

Paste a public Instagram post/Reel or TikTok video URL. Returns metadata (title, uploader, duration, resolution) and streams the video without watermark via yt-dlp.

POST `/api/reelsave/extract` with JSON body:

```json
{ "pageUrl": "https://www.tiktok.com/@user/video/123" }
```

GET `/api/reelsave/download?pageUrl=&formatId=` — stream MP4 download (server-side via yt-dlp).

GET `/api/reelsave/thumbnail?url=` — thumbnail proxy for preview.

**Server requirements:** `yt-dlp` and `ffmpeg` on PATH (installed automatically by `deploy/deploy.sh`). Optional env: `YTDLP_PATH`.

Supported links:

- **Instagram** — public posts and Reels
- **TikTok** — `tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com`

Limits:

- Public videos only (no Stories or private accounts)
- Max 200 MB per download
- Rate limit: 10 requests/min per IP
