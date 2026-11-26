# ElevationAIwork.com — landing page

Static marketing site for **Elevation AI** (elevationaiwork.com). No build step.

```
site/
  index.html          # the page (self-contained: inline CSS + scroll-reveal/form JS)
  assets/logo.svg     # mark + favicon
  assets/og.png       # social preview image (1200×630)
worker/
  intake.js           # Cloudflare Worker behind intake.elevationaiwork.com (contact form backend)
```

## Preview locally

```bash
python3 -m http.server 8090 --directory site
```

then open http://localhost:8090.

## Deploy (Render static site + Cloudflare DNS)

`render.yaml` is a Render Blueprint: static site, no build command, publish directory `site`.

1. Render dashboard → **New → Blueprint** → select this repo → Apply. (Or New → Static Site: build command empty, publish directory `site`.)
2. In the Render service → **Settings → Custom Domains** → add `elevationaiwork.com` and `www.elevationaiwork.com`. Render shows the records to create.
3. Cloudflare dashboard → DNS for `elevationaiwork.com`:
   - `www` → **CNAME** → `<service>.onrender.com`
   - apex `@` → **CNAME** → `<service>.onrender.com` (Cloudflare flattens CNAMEs at the apex) — or the A record Render gives you
   - Leave `dcops.elevationaiwork.com` untouched.
   - Start with the proxy **off (DNS only / grey cloud)** until Render issues its TLS cert; you can turn the orange cloud on afterwards if you want Cloudflare in front. If proxied, set SSL/TLS mode to **Full (strict)**.
4. Render auto-deploys on every push to `main`; PRs get preview URLs.

### Contact form backend

The intake form POSTs JSON to `https://intake.elevationaiwork.com` — the
`elevation-intake` Cloudflare Worker ([worker/intake.js](worker/intake.js)), which
emails the brief to the hello@ destination inbox via an Email Service binding
(variable `EMAIL`). It is deployed from the Cloudflare dashboard, not from this
repo — see the header comment in the file for redeploy instructions. If the
endpoint is down, the form falls back to a pre-filled mailto.

Any other static host works too (Cloudflare Pages, Netlify, S3) — just serve `site/`.

## Also in this repo

Two separate, self-contained games for the iPad live here as well. Neither is
part of the landing page or published by `render.yaml`; each README explains
how to host it.

- [`lantern-library/`](lantern-library/README.md): a reading-comprehension game.
- [`spellery/`](spellery/README.md): a spelling game.

## Open items before going live

- [x] `hello@elevationaiwork.com` forwards via Cloudflare Email Routing → timothy.patrick.ryan@gmail.com.
- [x] OG/Twitter image at `assets/og.png` (1200×630), wired into the meta tags.
- [x] Cloudflare Web Analytics beacon installed (cookie-free; token is a public site id).
