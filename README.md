# ElevationAIwork.com — landing page

Static marketing site for **Elevation AI** (elevationaiwork.com). No build step.

```
site/
  index.html          # the page
  assets/styles.css   # all styling (dark, responsive, reduced-motion aware)
  assets/logo.svg     # mark + favicon
```

## Preview locally

```bash
python3 -m http.server 8090 --directory site
```

then open http://localhost:8090.

## Deploy (Cloudflare Pages — the `elevationaiwork.com` zone is already on Cloudflare)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → **Upload assets** (or connect the GitHub repo).
2. Build settings: no framework, build command empty, output directory `site`.
3. Custom domains → add `elevationaiwork.com` and `www.elevationaiwork.com` (Cloudflare writes the CNAMEs for you; `dcops.elevationaiwork.com` is untouched).

Any static host works (Render static site, Netlify, S3) — just serve `site/`.

## Open items before going live

- [ ] Confirm contact address (page uses `hello@elevationaiwork.com`; set up the mailbox/forward in Cloudflare Email Routing or Resend).
- [ ] Replace the three "Request a copy" insight cards with real links once the journal/case-study PDFs are hosted.
- [ ] Decide which products should link out publicly (only DC Ops is linked today).
- [ ] Add an OG image (`assets/og.png`, 1200×630) and reference it in the `<meta property="og:image">`.
- [ ] Optional: analytics (Cloudflare Web Analytics is one script tag, no cookies).
