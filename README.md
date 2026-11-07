# NeuralArt — website

Static site for NeuralArt Consulting (AI & machine-learning consultancy, Vancouver).
Live: https://neuralart-consulting.netlify.app

No build step: plain HTML, CSS and JavaScript. Every push to `main` deploys on Netlify.

## Files

| File | What it does |
| --- | --- |
| `index.html` | The whole page: content, styles, and page scripts (kinetic wordmark, services navigator, contact dialog). |
| `physics.js` | Throwable wordmark letters and the tag pit in the contact section (uses Matter.js). |
| `na.js` | Animated generative plates on the service cards, scroll reveals, Vancouver clock. |
| `matter.min.js` | Local fallback copy of [Matter.js](https://brm.io/matter-js/) 0.19.0 (MIT). The page loads it from cdnjs first. |
| `404.html` | Not-found page. |
| `og.png`, `favicon.svg` | Share image and icon. |
| `netlify.toml` | Netlify settings and security/cache headers. |

## Editing

- **Text:** edit `index.html` directly.
- **Colours:** change `data-theme` on the `<html>` tag to `pink`, `volt`, `cyan` or `tomato`, or edit the `[data-theme=…]` blocks at the top of the `<style>`.
- **Contact form:** handled by Netlify Forms (form name `contact`). Submissions appear under Forms in the Netlify dashboard.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```
