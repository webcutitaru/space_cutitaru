# ReelSave — Chrome extension

Download Instagram Reels and TikTok videos through your Space ReelSave API (`/api/reelsave/*`).

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → this folder (`extensions/reelsave`)
4. After updates: click **Reload** on the extension card

## Use

1. Open an Instagram Reel or TikTok video (for Instagram, stay **logged in**)
2. Click the ReelSave icon
3. URL auto-fills from the current tab (or paste / **Use current tab**)
4. **Get video** → preview metadata
5. **Download** → save MP4

API base defaults to `https://space.cutitaru.com` (or localhost for local Next.js).

## Instagram login / cookies

Many Reels fail anonymously (“requires login”). The extension reads Instagram cookies from Chrome and sends them to your API for that request only.

- Log in to Instagram in the same Chrome profile
- Reload the Reel page, then try again

Server-wide alternative (web app `/reelsave` without the extension): set `YTDLP_COOKIES_FILE` to a Netscape `cookies.txt` on the server (see `.env.example`).

## Notes

- Public videos only (no Stories / private accounts)
- Max ~200 MB per download (server limit)
- Rate limit applies on the API
