# Build guide — Nicole Kansa portfolio (Astro · Cloudflare Workers · KV)

**Audience:** You, shipping in ~48 hours.  
**Stack:** Astro (static default + server API route), `@astrojs/cloudflare`, Tailwind v4, StPageFlip, Cloudflare Workers (GitHub Actions + Wrangler), KV, Cloudflare Web Analytics, apex domain `nicolekansa.com`.  
**Local toolchain:** pnpm, Node 22.

This guide is aligned with current Astro + Cloudflare docs (Astro 6 / `@astrojs/cloudflare` v13, Tailwind v4, Wrangler 4). Cross-check anytime with:

- [Astro: Deploy to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/)
- [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Cloudflare: Astro on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)
- [Workers KV](https://developers.cloudflare.com/kv/)
- [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [wrangler-action (GitHub Actions)](https://github.com/cloudflare/wrangler-action)

---

## 0. Prerequisites

1. **Cloudflare account** (free tier is fine for this scope).
2. **Domain** `nicolekansa.com` already on Cloudflare DNS (as in your PRD).
3. **GitHub** account and a new empty repo (e.g. `nicole-kansa-portfolio`).
4. **Tools installed locally:** Node **22**, **pnpm**, Git.

Optional but recommended: [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`pnpm add -D wrangler` in the project). **Rate Limiting bindings require Wrangler 4.36.0 or later** ([docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)).

---

## 1. Cloudflare: enable products and create resources

### 1.1 Image assets (`public/` WebP — no image hosting service)

Per the PRD, all magazine photos are **committed as WebP files** under `public/`, e.g. `public/images/magazine/cover.webp`. They are referenced as root-relative paths (`/images/magazine/cover.webp`) and served as static assets by Cloudflare's CDN — no Cloudflare Images product or `imagedelivery.net` URLs needed.

- Convert/export originals to WebP before committing. Size them for their largest on-screen display to avoid a dynamic resize API.
- Use `<img>` with explicit `width` and `height` to prevent layout shift.
- Cloudflare Images / R2 are explicitly **out of scope for v1** (PRD §6.4).

### 1.2 Workers KV (birthday wishes)

1. Dashboard → **Workers & Pages** → **KV**.
2. Create a namespace, e.g. `nicole-wishes-prod`.
3. Copy the **Namespace ID** (UUID). You will put this in `wrangler.jsonc`.

For local dev, Wrangler can use a **preview** namespace or `.dev.vars`; see section 5.

### 1.3 Rate limiting namespace (Workers Rate Limit binding)

You asked for **rate limiting** on `POST /api/wishes`. On Workers, use the **Rate Limiting API** binding ([docs](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)).

1. Pick a **unique positive integer string** per limiter on your account, e.g. `"1001"` for "wish POSTs". This is **not** your KV UUID — it is the `namespace_id` in Wrangler config.
2. In `wrangler.jsonc`, declare a `ratelimits` entry with a **name** (binding), that `namespace_id`, and `simple: { limit, period }`. **`period` must be `10` or `60` (seconds)** per Cloudflare's Rate Limiting API.

At runtime the binding exposes **`limit({ key })`**, which returns **`{ success }`** — if `success` is false, return **HTTP 429** ([example](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)):

```ts
const { success } = await env.WISH_RATE_LIMITER.limit({ key: "some-string" });
```

**Key choice:** Cloudflare's docs warn that **raw IP** can over-limit shared networks; for a small public `POST` endpoint, many apps still use **`POST /api/wishes` + IP** (e.g. `` `wish:${ip}` ``) for simplicity. Stronger options: add **Turnstile** and rate limit on a server-verified token, or use **user/session** keys later.

---

## 2. Create the Astro project

```bash
pnpm create astro@latest nicole-portfolio
cd nicole-portfolio
```

Suggested starters: **empty** or **minimal**, TypeScript **strict** if you're comfortable.

### 2.1 Add Cloudflare + Tailwind (official installers)

```bash
pnpm astro add cloudflare
pnpm astro add tailwind
```

What this does:

- `astro add cloudflare` — installs `@astrojs/cloudflare` v13 and sets the adapter in `astro.config.mjs`.
- `astro add tailwind` — installs **Tailwind v4** via the `@tailwindcss/vite` Vite plugin (not the legacy `@astrojs/tailwind` integration). Creates `src/styles/global.css` with `@import "tailwindcss";`.

### 2.2 Output mode (static default + server API route)

`output: "hybrid"` **was removed in Astro v5** and does not exist in Astro 6. TypeScript only accepts `'static'` or `'server'`.

The correct approach for your PRD (mostly static + one server API):

- Leave the output as the **default `'static'`** — no need to set it in config.
- Add `export const prerender = false` to **only** the API endpoint file.
- Static pages (`/`, `/hbd`) need no annotation — they prerender by default.

`astro.config.mjs` after running both `astro add` commands:

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
  },
});
```

> Note: `astro add tailwind` generates this Vite plugin pattern automatically for Tailwind v4. If you see `integrations: [tailwind()]` with an import from `@astrojs/tailwind`, that is the **legacy Tailwind 3** path — remove it and use the Vite plugin instead.

In the **API endpoint** (`src/pages/api/wishes.ts`):

```ts
export const prerender = false;
// ... GET and POST handlers
```

Static pages need nothing extra — prerender is the default.

**Official references:** [on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/), [Astro v5 upgrade — hybrid removed](https://docs.astro.build/en/guides/upgrade-to/v5/#removed-hybrid-rendering-mode), [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/).

### 2.3 StPageFlip and islands

Follow your PRD: initialize StPageFlip in an Astro island with `client:only="vanilla"` (or the framework you pick). Keep the magazine JS **lazy** where possible so LCP stays clean; preload only the **cover** hero as required by your PRD.

---

## 3. Wrangler configuration (`wrangler.jsonc`)

Put this at the **project root** next to `package.json`. Adjust names/IDs.

**Astro 6 + `@astrojs/cloudflare` v13** uses a **unified** Worker entrypoint (handles both dev and prod):

```jsonc
{
  "name": "nicole-portfolio",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-04-22",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist",
  },
  "kv_namespaces": [
    {
      "binding": "WISHES_KV",
      "id": "<PASTE_KV_NAMESPACE_ID>",
    },
  ],
  "ratelimits": [
    {
      "name": "WISH_RATE_LIMITER",
      "namespace_id": "1001",
      "simple": {
        "limit": 10,
        "period": 60,
      },
    },
  ],
}
```

Notes:

- **`compatibility_date`:** set to **the day you first deploy** (or today); bump occasionally per Cloudflare guidance.
- **`namespace_id` for rate limits:** any **unique positive integer string** you choose for this limiter; see [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).
- The Wrangler config file is **optional** for projects with no bindings — Astro auto-generates defaults. Since you have KV + rate limits, keep this file.
- If you add more bindings later (R2, D1, etc.), extend this file.

### 3.1 TypeScript types for `cloudflare:workers` env

Run this every time you change `wrangler.jsonc` or `.dev.vars`:

```bash
pnpm exec wrangler types
```

This helps `env.WISHES_KV` and `env.WISH_RATE_LIMITER` type-check in API code. You can automate it in `package.json` scripts:

```json
{
  "scripts": {
    "dev": "wrangler types && astro dev",
    "build": "wrangler types && astro check && astro build"
  }
}
```

---

## 4. Implement `/api/wishes` (same origin)

**Same-origin** means the browser calls `https://nicolekansa.com/api/wishes` — no CORS headaches for your own site. Deploy Astro + Worker as **one** Workers project; the Worker handles API and static assets together.

### 4.1 Environment access (Astro 6 + Cloudflare)

Per [@astrojs/cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/), use:

```ts
import { env } from "cloudflare:workers";
```

to read **bindings** (`WISHES_KV`, `WISH_RATE_LIMITER`) and vars configured for the Worker project.

`Astro.locals.cfContext` exposes **`waitUntil`** and related execution context when you need it from `.astro` files; in endpoints, use the `APIContext` patterns from Astro's endpoint docs.

### 4.2 KV data model (from your PRD)

- **Key:** `wish:{timestamp}-{random}`
- **Value:** JSON `{ name, message, stickers[], drawing, createdAt }`

**Read path:** `KV.list({ prefix: "wish:" })` then `KV.get` per key (mind [KV consistency](https://developers.cloudflare.com/kv/reference/faq/) — reads are eventually consistent).

**Write path:** validate payload size (base64 drawings can get large), reject oversized bodies before touching KV.

### 4.3 Rate limit (POST only)

1. Build a **string key** (see §1.3 — IP-based keys are a tradeoff; composite keys like `wish-post:<ip>` are fine to start).
2. `const { success } = await env.WISH_RATE_LIMITER.limit({ key: yourKey });`
3. If `!success`, return **429** with a small JSON body.

Counters are **per Cloudflare PoP / locality**, not global — see [Locality](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) in the same doc.

### 4.4 Optional hardening (short on time — pick later)

- **Turnstile** on `/hbd` + verify server-side (bot protection).
- **Stricter JSON schema** (zod) for `name` / `message` length and sticker bounds.
- **Move huge drawings to R2** if KV value size becomes an issue (your PRD already mentions this).

---

## 5. Local development

```bash
pnpm install
pnpm dev
```

- Astro 6's Cloudflare integration runs dev in **`workerd`** (close to prod). If something only breaks in dev, compare with a production build:

```bash
pnpm build
pnpm exec wrangler dev
```

**Local secrets:** `.dev.vars` at project root for Wrangler (do not commit). Example:

```text
MY_SECRET=value_here
```

KV / rate limits: prefer `wrangler dev` with remote bindings or preview namespaces as documented in Wrangler.

---

## 6. Cloudflare Web Analytics

1. Dashboard → **Web Analytics** → add site / get snippet.
2. Inject snippet in a **base layout** or `src/layouts/Layout.astro` so it runs on `/` and `/hbd`.

No cookie banner needed for standard CF Web Analytics setup — still verify your legal/privacy copy when you go live.

---

## 7. GitHub repository

```bash
git init
git add .
git commit -m "Initial Astro + Cloudflare portfolio scaffold"
git branch -M main
git remote add origin https://github.com/<you>/<nicole-kansa-portfolio>.git
git push -u origin main
```

Add `.gitignore` entries for `.env`, `.dev.vars`, `dist/`, `.wrangler/`, etc. (Astro's template usually covers most.)

---

## 8. Cloudflare Workers project (CI-driven)

> **Note:** `@astrojs/cloudflare` v13 (Astro 6) **no longer supports Cloudflare Pages**. Deploy to **Cloudflare Workers** instead. See [Cloudflare's migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) if you have an existing Pages project.

**Recommended pattern for a new project — Workers Builds (CI from dashboard):**

1. Dashboard → **Compute (Workers) → Workers & Pages** → **Create application** → **Import a repository**.
2. Connect your GitHub account and select the repo.
3. Configure the project:
   - **Build command:** `pnpm install && pnpm build`
   - **Deploy command:** `pnpm exec wrangler deploy`
4. Note your **Account ID** (Dashboard sidebar).
5. Create an **API token** for CI (if using GitHub Actions instead of Workers Builds):
   - Permissions: **Workers Scripts — Edit** + **Workers KV Storage — Edit** (least privilege that allows `wrangler deploy` with bindings).

Store as GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

---

## 9. GitHub Actions workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

**Notes:**

- `command: deploy` runs `wrangler deploy` — this deploys to **Cloudflare Workers**, not Pages.
- `pnpm/action-setup` version and `pnpm` version should match what you use locally; generate a lockfile with `pnpm install` before first CI run.
- Official pattern reference: [wrangler-action README](https://github.com/cloudflare/wrangler-action).

### 9.1 Workers environment variables (dashboard)

Bindings declared in `wrangler.jsonc` (KV, rate limits) are applied automatically on deploy. For any non-secret runtime vars, add them in:

Dashboard → **Workers & Pages** → your Worker → **Settings → Variables and Secrets**.

**Secrets** — use `wrangler secret put <KEY>` or the dashboard encrypted secrets UI (never commit them).

After the first successful deploy, open the **Workers URL** and test:

- `/` magazine
- `/hbd`
- `GET /api/wishes`
- `POST /api/wishes` with rate limit (spam refresh / script to confirm 429s)

---

## 10. DNS: apex `nicolekansa.com`

1. Dashboard → **Workers & Pages** → your Worker → **Settings → Domains & Routes** → **Add Custom Domain**.
2. Add `nicolekansa.com` (apex).
3. Cloudflare automatically creates a proxied DNS record (orange-cloud CNAME flattening at apex).

Verify:

- **Orange-cloud proxied** record in DNS as set by the Workers custom domain UI.
- HTTPS is handled automatically by Cloudflare.

**WWW:** Your PRD only specifies apex. If you add `www` later, pick **one canonical** host and add a **redirect rule** (www → apex or the reverse).

---

## 11. Placeholders cheat sheet (where real values go)

| What                      | Placeholder example              | Where you get the real value                                                                           |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Image in magazine         | `/images/magazine/cover.webp`    | Commit WebP file under `public/images/magazine/`                                                       |
| Contact email             | `hello@example.com`              | Nicole — then `mailto:real@email`                                                                      |
| Instagram                 | `https://instagram.com/USERNAME` | Nicole's handle                                                                                        |
| WhatsApp                  | `https://wa.me/62XXXXXXXX`       | [wa.me format](https://faq.whatsapp.com/general/about-wa-me) — country code + number, no `+` or spaces |
| KV namespace ID           | UUID in `wrangler.jsonc`         | Workers & Pages → KV                                                                                   |
| Rate limit `namespace_id` | `"1001"`                         | You choose (unique int string per limiter); stays in `wrangler.jsonc`                                  |

---

## 12. Quick verification checklist (before handoff)

- [ ] Lighthouse mobile >= 90 (per PRD); LCP hero preloaded.
- [ ] Cover image is a committed WebP under `public/` and loads on the live domain.
- [ ] `/api/wishes` works on **production domain** (not only `*.workers.dev` if DNS is live).
- [ ] Rate limit triggers on burst POSTs.
- [ ] KV entries appear with `wish:` prefix; GET returns expected list.
- [ ] Web Analytics shows traffic on `/` and `/hbd`.
- [ ] No secrets committed; GitHub secrets + Workers secrets only.

---

## 13. If something breaks

| Symptom                                | Likely cause                                                                                                                                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build OK, API 404 on Workers           | Endpoint missing `export const prerender = false`; or `wrangler.jsonc` `main` not pointing to `@astrojs/cloudflare/entrypoints/server` — re-read [Astro Cloudflare deploy](https://docs.astro.build/en/guides/deploy/cloudflare/). |
| KV undefined in handler                | Binding name mismatch (`WISHES_KV` in wrangler vs code); Worker missing binding — check `wrangler.jsonc` and redeploy.                                                                                                             |
| Rate limit binding missing             | `ratelimits` block not deployed; or wrong `namespace_id` type (must be string of positive int).                                                                                                                                    |
| Images 404                             | WebP file not committed under `public/`; wrong path used (must be root-relative `/images/...`).                                                                                                                                    |
| CI deploy auth error                   | API token scope (needs Workers Scripts Edit) or wrong `accountId`.                                                                                                                                                                 |
| TypeScript error on `output: 'hybrid'` | Remove `output` from config entirely (defaults to `'static'`); use `prerender = false` on the API route only.                                                                                                                      |

---

**End of guide.** When dependencies bump, re-run `pnpm astro add cloudflare` on a scratch branch and diff the generated config against this file — Astro 6+ moves quickly; trust [docs.astro.build](https://docs.astro.build/) over any static tutorial.
