# Nicole Kansa — Portfolio

A personal portfolio for **Nicole Kansa**, built around an **interactive editorial magazine**: visitors flip through paper-like spreads for bio, gallery, credits, and contact—an aesthetic that fits someone pursuing a **professional modeling** career, with high-fashion typography and full-bleed photography.

A separate experience lives at **[`/hbd`](./src/pages/hbd.astro)**: a birthday wish board where guests can **leave a message**, **place stickers**, and **doodle** on a shared whiteboard. Stop by, celebrate, and send her your wishes.

thanks composer 2 for helping out vibeslop this site 🙏

---

## Tech stack

| Area            | Choice                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | [Astro](https://astro.build) (SSG + server routes)                                                                                                              |
| Deploy target   | [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [`@astrojs/cloudflare`](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) |
| Magazine UI     | [page-flip](https://github.com/Nodlik/StPageFlip) (flip book / spreads)                                                                                         |
| Styling         | [Tailwind CSS v4](https://tailwindcss.com) (`@tailwindcss/vite`)                                                                                                |
| Birthday wishes | `GET` / `POST` [`/api/wishes`](./src/pages/api/wishes.ts) — [Cloudflare KV](https://developers.cloudflare.com/kv/), rate limiting                               |
| Client drawing  | HTML5 canvas (brush / eraser) + draggable stickers                                                                                                              |
| Analytics       | [Cloudflare Web Analytics](https://developers.cloudflare.com/web-analytics/) (optional; `PUBLIC_CF_WEB_ANALYTICS_TOKEN`)                                        |
| Tooling         | pnpm, Node 22, TypeScript                                                                                                                                       |

CI: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — install, `pnpm build`, `wrangler deploy` with Cloudflare API token + account id secrets.

---

## Project structure

```text
.
├── .github/workflows/     # GitHub Actions (deploy to Workers)
├── prd/                   # Product / build docs (PRD, build guide)
├── public/                # Static assets (served as-is)
│   ├── images/            # Magazine & misc WebP
│   ├── stickers/         # Sticker art for /hbd (e.g. sticker-a.webp)
│   └── favicon.*          # Icons
├── src/
│   ├── components/
│   │   ├── hbd/           # Birthday board: wish form, whiteboard, stickers, cards
│   │   └── magazine/      # Flip book shell + one component per page spread
│   │       └── pages/     # PageCover, PageBio, PageGallery*, PageContact, etc.
│   ├── layouts/
│   │   └── Layout.astro   # Global shell, fonts, optional analytics beacon
│   ├── pages/
│   │   ├── index.astro    # `/` — magazine
│   │   ├── hbd.astro      # `/hbd` — birthday board
│   │   └── api/
│   │       └── wishes.ts  # Wish CRUD (KV) for production Worker
│   ├── styles/
│   │   └── global.css     # Tailwind + design tokens (shell, page, ink, …)
│   └── types/             # Shared TS (e.g. wish payload)
├── astro.config.mjs
├── wrangler.jsonc         # Cloudflare bindings (KV, rate limits, etc.)
├── .env.example           # e.g. PUBLIC_CF_WEB_ANALYTICS_TOKEN
└── package.json
```

---

## Local development

```bash
pnpm install
cp .env.example .env   # optional: add PUBLIC_CF_WEB_ANALYTICS_TOKEN, etc.
pnpm dev               # http://localhost:4321
```

- `/` — magazine portfolio
- `/hbd` — birthday board (API needs KV in dev: use [Wrangler](https://developers.cloudflare.com/workers/wrangler/) with bindings from `wrangler.jsonc` or project docs in `prd/build-guide.md`)

```bash
pnpm build     # production build
pnpm preview   # preview build locally
```

---

## Design note

The **magazine** metaphor is intentional: editorial layout, strong type, and a tactile page-flip keep the experience closer to a **fashion spread** than a traditional grid portfolio—aligned with Nicole’s direction as a model, while keeping the build fully static and fast on Cloudflare’s edge.

For deployment details, env vars, and Cloudflare setup, see **`prd/build-guide.md`**.

---
