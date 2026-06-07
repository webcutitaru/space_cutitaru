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
| `/api/reviews/extract` | POST API for review extraction |

## Reviews Extractor

POST `/api/reviews/extract` with JSON body:

```json
{ "storeUrl": "https://your-store.com" }
```

Returns aggregated reviews with provider metadata. Supports Judge.me API (when public token is exposed), plus HTML fallback for Loox, Yotpo, and native widgets.

Limits in v1:

- Max 50 products per run
- Public storefront reviews only
- Some stores may block automated access
