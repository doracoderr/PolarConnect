# PolarConnect

**Integrated Polar Science Outreach, Knowledge Repository and Media Dissemination Portal**

Built for **Smart India Hackathon 2026** — Problem Statement **SIH26063** (NCPOR) — Theme: Smart Education
**Team: The PARIKALP**

| Role | Name |
|---|---|
| Team Lead | Abhishek Prasad |
| Member | Govind Yadav |
| Member | Shah Alam |
| Member | Harsh |
| Member | Chetna |
| Member | Chaitali |

## Problem

NCPOR (National Centre for Polar and Ocean Research, Ministry of Earth Sciences) runs expeditions to Antarctica, the Arctic and the Himalaya, generating reports, datasets, photos and videos that are currently scattered and not organized for public access.

## Solution

A web portal where NCPOR admins upload expedition content, which is automatically summarized, captioned for social media, and published on a searchable, SEO-optimized public site.

### Core Modules
- **Admin Panel** — secure upload with metadata (title, expedition, category, date, tags)
- **Duplicate Detection** — SHA-256 file hash computed server-side before Cloudinary upload; exact-duplicate files are rejected up front
- **Auto-Summary Generator** — produces a description + social caption on every upload, in **English and Hindi**
- **Public Portal** — search and browse by category / expedition / year, with an EN/HI language toggle
- **SEO Layer** — schema.org structured data, sitemap, meta tags
- **Rate Limiting** — brute-force protection on admin login, general ceiling on the public API

## Tech Stack

- Frontend: **React (Vite)**
- Backend: **Node.js + Express**
- Database: **MongoDB (Mongoose)**
- Media Storage: **Cloudinary** (signed direct upload)
- Auth: **JWT + bcrypt**
- Email: **Resend**

## System Flow

```
Admin selects file + metadata
   -> File goes to OUR server, SHA-256 hash computed
   -> Duplicate? -> rejected before touching Cloudinary
   -> Not a duplicate -> server streams it to Cloudinary, gets secure URL
   -> Node.js API saves record in MongoDB (with file hash)
   -> Auto-summary service generates description + social caption (English + Hindi)
   -> Admin gets email confirmation
   -> Public portal fetches & renders content with SEO tags, in the visitor's chosen language
```

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Admin login, returns JWT (rate-limited: 5/15min) |
| POST | `/api/upload` | Multipart file upload — server hashes the file, rejects exact duplicates (409), then forwards to Cloudinary |
| POST | `/api/content` | Create a content record (auto-generates EN + HI summary/caption if not supplied) |
| GET | `/api/content` | List / search / filter published content — `?lang=hi` for Hindi text |
| GET | `/api/content/:id` | Get single content item — `?lang=hi` for Hindi text |
| PUT | `/api/content/:id` | Update a content record (admin only) |
| DELETE | `/api/content/:id` | Remove a content record (admin only) |
| GET | `/sitemap.xml` | XML sitemap for search engines |
| GET | `/robots.txt` | Crawler rules, points at the sitemap |
| GET | `/api/sitemap` | JSON site index (category → content), used by the `/sitemap` page |

## SEO

- **Meta tags & Open Graph** — each content page (`ContentDetail.jsx`) sets a dynamic `<title>`, meta description, and `og:title`/`og:description`/`og:image` so shared links preview correctly.
- **Structured data** — a `schema.org` JSON-LD block (`CreativeWork`/`ImageObject`/`VideoObject`) is injected per content page for Google rich results.
- **`sitemap.xml`** — auto-generated from all approved content, for search engines.
- **`robots.txt`** — allows public routes, disallows `/admin/`.
- **Human-readable Sitemap page** (`/sitemap`) — a categorized index of every published item, for visitors and screen readers (the way many government sites, e.g. UIDAI, expose one), not just search-engine crawlers.

> **Deployment note:** `sitemap.xml` and `robots.txt` must be reachable at the **site's own domain root** (e.g. `polarconnect.in/sitemap.xml`), not the API's. If the frontend and backend are deployed on different domains/subdomains, reverse-proxy those two paths from the frontend domain to the backend, or serve them as static files from the frontend build instead.

## Getting Started

```bash
# backend
cd server
npm install
npm run dev

# frontend
cd client
npm install
npm run dev
```

Create a `.env` in `server/` with:

```
MONGO_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_TO=
PUBLIC_SITE_URL=
```

## Local AI summary (offline, no Gemini API key)

`server/src/controllers/content.controller.js` now uses `summary.local.service.js`
instead of Gemini. Everything runs on-device via `@huggingface/transformers`,
including English→Hindi translation of the description and social caption
(`Xenova/opus-mt-en-hi`, same offline/no-API-key model cache).

**Install (inside `server/`):**
```
npm install
```
This pulls in the new dependencies already added to `package.json`:
`@huggingface/transformers`, `pdf-parse`, `mammoth`, `wavefile`.

**System requirement:** FFmpeg must be installed and on PATH (needed for video
frame + audio extraction).
- Windows: `choco install ffmpeg` or download from ffmpeg.org and add to PATH
- Mac: `brew install ffmpeg`
- Linux: `sudo apt install ffmpeg`

Check it worked: `ffmpeg -version`

**First run:** AI models (~1GB total) download automatically on first use and
are cached in `server/.model-cache/` — no repeat downloads after that, works
offline from then on. `.model-cache/` is git-ignored.

**Old Gemini service:** `summary.service.js` is left untouched in the repo
(unused now) in case you want to switch back — just revert the one import
line in `content.controller.js`.

## References

- NCPOR — https://ncpor.res.in
- Cloudinary docs — https://cloudinary.com/documentation
- Schema.org — https://schema.org
