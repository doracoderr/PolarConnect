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

## Problem

NCPOR (National Centre for Polar and Ocean Research, Ministry of Earth Sciences) runs expeditions to Antarctica, the Arctic and the Himalaya, generating reports, datasets, photos and videos that are currently scattered and not organized for public access.

## Solution

A web portal where NCPOR admins upload expedition content, which is automatically summarized, captioned for social media, and published on a searchable, SEO-optimized public site.

### Core Modules
- **Admin Panel** — secure upload with metadata (title, expedition, category, date, tags)
- **Auto-Summary Generator** — produces a description + social caption on every upload
- **Public Portal** — search and browse by category / expedition / year
- **SEO Layer** — schema.org structured data, sitemap, meta tags

## Tech Stack

- Frontend: **React (Vite)**
- Backend: **Node.js + Express**
- Database: **MongoDB (Mongoose)**
- Media Storage: **Cloudinary** (signed direct upload)
- Auth: **JWT + bcrypt**
- Email: **Resend**

## System Flow

```
Admin uploads content + metadata
   -> Cloudinary stores media, returns secure URL
   -> Node.js API saves record in MongoDB
   -> Auto-summary service generates description + social caption
   -> Admin gets email confirmation
   -> Public portal fetches & renders content with SEO tags
```

## API Overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Admin login, returns JWT |
| GET | `/api/upload/signature` | Get signed Cloudinary upload signature |
| POST | `/api/content` | Create a content record |
| GET | `/api/content` | List / search / filter published content |
| GET | `/api/content/:id` | Get single content item |
| PUT | `/api/content/:id` | Update a content record (admin only) |
| DELETE | `/api/content/:id` | Remove a content record (admin only) |

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
```

## References

- NCPOR — https://ncpor.res.in
- Cloudinary docs — https://cloudinary.com/documentation
- Schema.org — https://schema.org
