# ZopDev · marketing site + brand kit

Static HTML/CSS/JS. No build step, no framework. Deploys as-is to any
static host, this repo is configured for Vercel via `vercel.json`.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Homepage |
| `brand-kit.html` | Self-serve brand kit · 20 templates including multi-slide carousels, exports as PNG / ZIP / PDF |
| `brand-launch.html`, `brand-guidelines.html` | Brand reference pages |
| `tokens.css`, `homepage-chrome.css`, `chrome.css` | Design system |
| `DESIGN.md` | Design system spec (anti-references, motion rules, component patterns) |
| `blog/`, `compare/`, `solutions/`, `product/`, `company/`, `developers/`, `legal/`, `trust/` | Site sections |

## Local preview

Any static server works. From this directory:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or with Node:

```bash
npx serve .
```

## Brand kit · what you get

`brand-kit.html` is a single-page tool that renders 20 production-ready
templates and exports them at native resolution.

- **18 single-asset templates**, LinkedIn cover / square / landscape, X
  banner, X post, Instagram square + story, Facebook cover, YouTube
  banner + thumbnail, Zoom background, OG card, Slide cover, Quote card,
  Stat card, Email signature, Slack avatar, Press kit
- **2 multi-slide carousels**, square (1080×1080) and portrait
  (1080×1350), up to 10 slides each, three slide types (cover / content /
  end), exports as PNG ZIP or multi-page PDF for LinkedIn document posts
- **Live preview, on-brand by default**, sub-brand picker (Dev / Night /
  Day / Cloud), background swatches, custom accent colour, brand-mark
  size + position + edge padding, optional background and foreground
  image upload, ink overlay for legibility
- **Persistent state**, every keystroke saves to localStorage, so your
  in-progress assets survive a reload

No backend. Uses `html-to-image`, `JSZip`, and `jsPDF` from CDN.

## Deploying

Configured for Vercel. After connecting the repo, Vercel auto-detects
the static build and serves the directory. `vercel.json` handles clean
URLs, cache headers for assets vs HTML, and basic security headers.

The brand kit lives at `/brand-kit` once deployed.
# ZopNight-Website
