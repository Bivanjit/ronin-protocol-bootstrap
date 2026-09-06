# RONIN 影 Website

Static marketing site for RONIN 影, the predictive on-chain intelligence project.

## Run locally

From `apps/web`:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deployment

The site has no build step. Set the deployment root to `apps/web` and publish `index.html` as the entry point.

## Design goals

- Dark, high-trust intelligence aesthetic
- Lightweight CSS/SVG motion instead of a heavy animation framework
- GPU-friendly transform/opacity animations
- Responsive mobile layout
- Reduced-motion support
- Product messaging based on the current Ronin architecture
- Pricing shown as launch positioning, not a performance guarantee

The founder-window copy currently uses the agreed launch tactic: first 100 members receive $0 entry access, then entry access becomes $1/month. Change that copy before launch if the final cohort size or pricing strategy changes.
