# ElevationAIwork.com — landing page

Static marketing site for **Elevation AI** (elevationaiwork.com). No build step.

```
site/
  index.html          # the page
  assets/styles.css   # all styling (dark, responsive, reduced-motion aware)
  assets/logo.svg     # mark + favicon
  assets/og.png       # social preview image (1200×630)
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

Any other static host works too (Cloudflare Pages, Netlify, S3) — just serve `site/`.

## Open items before going live

- [x] `hello@elevationaiwork.com` forwards via Cloudflare Email Routing → timothy.patrick.ryan@gmail.com.
- [x] "Request a copy" insight cards open a pre-filled request email (swap for direct PDF links once hosted).
- [ ] Decide which products should link out publicly (only DC Ops is linked today).
- [x] OG/Twitter image at `assets/og.png` (1200×630), wired into the meta tags.
- [x] Cloudflare Web Analytics beacon installed (cookie-free; token is a public site id).
