# PRD — Nicole Kansa Portfolio Website

**Version:** 1.1  
**Status:** Draft  
**Domain:** nicolekansa.com  
**Last updated:** 2026-04-22

---

## 1. Overview

A personal portfolio website for model Nicole Kansa. The site's defining interaction is a full-screen interactive magazine rendered in the center of a white page — visitors flip through physical, paper-like pages to explore Nicole's story, photos, and contact details. A secondary route (`/hbd`) provides a standalone birthday wish board where visitors can leave messages and place stickers.

---

## 2. Goals

- Create a memorable, high-fashion first impression that stands out from typical model portfolio sites
- Present Nicole's work through an editorial magazine metaphor with tactile page-turn interaction
- Serve all images and static assets fast globally via Cloudflare Pages’ CDN (no separate image hosting product)
- Keep the site fully static (no CMS, no database) with one optional Worker for the birthday board
- Deploy to `nicolekansa.com` through Cloudflare Pages with zero-config CI/CD

---

## 3. Non-Goals

- No CMS or admin panel (content is hardcoded in Astro components for now)
- No multi-language support
- No e-commerce or paid booking system
- No user authentication

---

## 4. Tech Stack

| Layer                      | Choice                   | Reason                                                                                |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------- |
| Framework                  | Astro (static output)    | Zero JS by default, file-based routing, familiar                                      |
| Magazine interaction       | StPageFlip               | Mature library, touch + mouse + keyboard support                                      |
| Styling                    | Tailwind CSS             | Utility-first, pairs well with Astro                                                  |
| Image assets               | WebP in `public/`        | No extra image service or budget; files ship with the site and are cached at the edge |
| Hosting                    | Cloudflare Pages         | Git-push deploy; serves HTML, JS, and static images together                          |
| DNS                        | Cloudflare               | Domain already managed here                                                           |
| Analytics                  | Cloudflare Web Analytics | Privacy-first, no cookie banner needed                                                |
| Birthday board persistence | Cloudflare KV            | Lightweight key-value, Worker-accessible                                              |
| Contact Worker (optional)  | Cloudflare Worker        | Only if contact form is added later                                                   |

---

## 5. Routes

| Route  | Description                             |
| ------ | --------------------------------------- |
| `/`    | Main portfolio — white shell + magazine |
| `/hbd` | Birthday wish board                     |

---

## 6. Main Site (`/`)

### 6.1 Shell

The outer page is pure white (`#ffffff`). The magazine sits centered both horizontally and vertically on the viewport, with a subtle drop shadow beneath it to suggest physical paper resting on a surface. No navigation bar, no footer — the magazine is the entire interface.

On screens narrower than the magazine's minimum width, the magazine scales down proportionally to fill the viewport width with consistent margins.

### 6.2 Magazine Pages

The magazine is rendered by StPageFlip. Each spread is two facing pages. Total page count: **10 pages (5 spreads)**.

| Spread | Left page            | Right page               |
| ------ | -------------------- | ------------------------ |
| 1      | Cover                | Contents / issue details |
| 2      | Bio & stats          | Portrait photo           |
| 3      | Photo gallery (2-up) | Photo gallery (2-up)     |
| 4      | Credits & work       | Credits & work (cont.)   |
| 5      | Contact              | Back cover               |

#### Page details

**Cover (page 1)**

- Full-bleed hero image (WebP in `public/`, supplied asset)
- Magazine title: `NICOLE` in large serif or condensed sans
- Issue line: `PORTFOLIO — 2026`
- Minimal — let the photo carry the page

**Contents / issue details (page 2)**

- Table of contents listing the four sections
- Small typographic detail: issue number, year, location (`Bogor, Indonesia`)

**Bio & stats (page 3)**

- Name: Nicole Kansa
- Short bio paragraph (placeholder until supplied)
- Stats block:
  - Height: 170 cm
  - Weight: 56 kg
  - Age: 24
  - Based: Bogor, Indonesia
- Typography-forward layout, minimal decoration

**Portrait photo (page 4)**

- Full-bleed or near-full-bleed portrait
- Placeholder image until asset supplied

**Photo gallery spreads (pages 5–6)**

- Grid or editorial collage layout
- Mix of supplied photos + placeholder blocks for missing assets
- Placeholder blocks: solid `#e8e8e8` rectangles with `©` and dimension label

**Credits & work (pages 7–8)**

- Section heading: `WORK & CREDITS`
- Placeholder content with clearly marked TODOs for brand/photographer names
- Clean list layout, editorial feel

**Contact (page 9)**

- Section heading: `GET IN TOUCH`
- Three static links (no form):
  - Email: `mailto:` link (address TBD)
  - Instagram: `https://instagram.com/[handle]` (handle TBD)
  - WhatsApp: `https://wa.me/[number]` (number TBD)
- Links open in a new tab
- Typographic treatment — no buttons, styled as editorial text links

**Back cover (page 10)**

- Minimal — logo/name mark, `nicolekansa.com`, year
- Optional: small photo or pattern

### 6.3 Magazine Interaction

Implemented via StPageFlip, initialized in an Astro island (`client:only="vanilla"`).

| Input                   | Behaviour             |
| ----------------------- | --------------------- |
| Click / drag right edge | Turn to next page     |
| Click / drag left edge  | Turn to previous page |
| Arrow Right / Space     | Next page             |
| Arrow Left              | Previous page         |
| Touch swipe left        | Next page             |
| Touch swipe right       | Previous page         |

Page-turn sound: off by default (StPageFlip supports this, omit for clean UX).

### 6.4 Image Delivery

All magazine and site photos are **committed as WebP** (and optional stickers or small PNGs where transparency matters) under **`public/`**, e.g. `public/images/magazine/cover.webp`, referenced from Astro as root-relative URLs (`/images/magazine/cover.webp`).

**Workflow**

- Export or convert originals to **WebP** before commit; size images for their largest on-screen use (e.g. cover / gallery widths per §8.4) to keep weight down without a dynamic image API.
- Use `<img>` with explicit `width` and `height` (or Astro’s asset tooling if added later) to limit layout shift. For responsive layouts, hand-authored **`srcset` / `sizes`** are optional v1 improvements if multiple widths are pre-exported.
- **Placeholder** slots use a local SVG or neutral gray block (§6.2) — no external placeholder service.

**v1 non-goal:** Cloudflare Images, R2-backed public gallery, or on-the-fly resizing (can be reconsidered if budget or scale changes).

---

## 7. Birthday Board (`/hbd`)

### 7.1 Concept

A separate, self-contained page — not part of the magazine. Visitors land on a canvas-like board where they can:

1. Type a birthday message
2. Choose a sticker to place on the board (sticker set TBD — assets to be supplied)
3. Draw freehand (simple brush, one color or color picker, eraser)
4. Submit — their name + message + sticker positions are saved

All submitted wishes are displayed on the board as sticky-note-style cards for other visitors to read.

### 7.2 Interaction Details

| Feature    | Detail                                                              |
| ---------- | ------------------------------------------------------------------- |
| Text input | Name + message fields, max 280 chars                                |
| Stickers   | PNG/WebP assets, drag to position on canvas, tap to place on mobile |
| Drawing    | HTML5 Canvas, simple freehand brush, eraser, one stroke width       |
| Submit     | Saves to Cloudflare KV via a Worker POST endpoint                   |
| Read       | On load, fetches all wishes from KV and renders them                |

Drawing complexity is intentionally kept light — single color (or small palette), single brush size, eraser. The goal is a personal touch, not a full drawing app.

### 7.3 Data Model (Cloudflare KV)

Key: `wish:{timestamp}-{random}`

Value (JSON):

```json
{
  "name": "string",
  "message": "string",
  "stickers": [{ "id": "string", "x": 0, "y": 0 }],
  "drawing": "base64 PNG string or null",
  "createdAt": "ISO8601"
}
```

Drawings are stored as base64-encoded PNGs (canvas `toDataURL`). If size becomes an issue, drawings can be stored in Cloudflare R2 instead with a reference URL in KV.

### 7.4 Worker Endpoints

| Method | Path          | Action                    |
| ------ | ------------- | ------------------------- |
| `GET`  | `/api/wishes` | Return all wishes (array) |
| `POST` | `/api/wishes` | Save a new wish           |

Worker lives in `workers/wishes.ts`, deployed alongside Pages via `wrangler`.

### 7.5 Stickers

Sticker assets to be supplied by client. Format: PNG or WebP, transparent background, recommended size 200×200px. Until supplied, the sticker picker shows labeled placeholder squares.

---

## 8. Design System

### 8.1 Aesthetic

Bold & high-fashion. The magazine should feel like a real editorial publication — strong typographic hierarchy, dramatic use of white space and full-bleed imagery, black-and-white as the primary palette with the occasional accent.

### 8.2 Typography

| Role                     | Suggestion                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Magazine title / display | A condensed serif or tall sans (e.g. `Playfair Display`, `Cormorant`, or `DM Serif Display`) |
| Body / stats             | Clean grotesque (`Inter`, `DM Sans`, or `Neue Haas Grotesk` via Google Fonts)                |
| Captions / labels        | Same grotesque, lighter weight, tracked uppercase                                            |

Final font choices to be confirmed during implementation. All fonts loaded via `<link rel="preload">` for performance.

### 8.3 Color

| Token              | Value                                  |
| ------------------ | -------------------------------------- |
| Shell background   | `#ffffff`                              |
| Page background    | `#faf9f7` (off-white, warm paper feel) |
| Primary text       | `#0a0a0a`                              |
| Muted text         | `#6b6b6b`                              |
| Placeholder blocks | `#e8e8e8`                              |
| Accent (optional)  | TBD with client                        |

### 8.4 Magazine Dimensions

| Viewport            | Magazine width                                    | Aspect ratio                   |
| ------------------- | ------------------------------------------------- | ------------------------------ |
| Desktop (≥1280px)   | 900px (450px per page)                            | ~0.7 (portrait, magazine-like) |
| Tablet (768–1279px) | 80vw                                              | same ratio                     |
| Mobile (<768px)     | Single-page mode — one page at a time, full width | same ratio                     |

StPageFlip supports single-page mode on mobile natively via the `mobileScrollSupport` option.

---

## 9. Performance Requirements

- Lighthouse Performance score ≥ 90 on mobile
- LCP < 2.5s (hero image on cover must be preloaded)
- All raster images shipped as **WebP files** in `public/` (served as static assets, cached by Cloudflare)
- No render-blocking resources; StPageFlip loaded as a module

---

## 10. Analytics

Cloudflare Web Analytics snippet added to the Astro base layout. No cookies, no GDPR banner required. Tracks page views for both `/` and `/hbd`.

---

## 11. Deployment

```
GitHub repo
  └── push to main
        └── Cloudflare Pages build
              ├── astro build  →  dist/
              └── wrangler deploy  →  Workers (wishes API)
```

Custom domain `nicolekansa.com` pointed at the Pages project via Cloudflare DNS (CNAME or direct Pages domain).

Configuration and secrets stored in Cloudflare Pages / Wrangler / CI (not committed to repo) as needed, for example:

- **KV** — namespace binding for birthday wishes (`/api/wishes`), declared in Wrangler config and/or the Pages project.

**Images** require no Cloudflare env vars: paths are static under `public/`.

---

## 12. Open Items

| #   | Item                                                              | Owner        |
| --- | ----------------------------------------------------------------- | ------------ |
| 1   | Confirm email, Instagram handle, WhatsApp number for contact page | Nicole       |
| 2   | Supply remaining photo assets                                     | Nicole       |
| 3   | Supply credits & brand list                                       | Nicole       |
| 4   | Supply sticker PNG/WebP assets for `/hbd`                         | Nicole       |
| 5   | Confirm display/body font pairing                                 | Dev + Nicole |
| 6   | Confirm accent color (or confirm black/white only)                | Nicole       |
| 7   | Confirm bio paragraph text                                        | Nicole       |

---

## 13. Out of Scope (v1)

- CMS or content editing interface
- Password-protected pages
- Video reel page
- Booking / availability calendar
- Multi-language support
