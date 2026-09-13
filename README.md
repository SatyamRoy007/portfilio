# Akhil Roy — Code, creativity & growth

A single-screen portfolio for a software developer and digital marketer, set in a living pixel village.

Live site: https://satyamroy007.github.io/portfilio/

## Run locally

This is a static website with no dependencies or build step. Serve the repository with any static file server, for example:

```sh
python -m http.server 4174
```

Open http://localhost:4174/. Opening `index.html` directly also works. Fonts, project images and PDFs are local.

## Edit

- `index.html`: portfolio structure, biography, hobbies, contact and world controls.
- `style.css`: responsive layout, typography and appearance.
- `app.js`: same-screen navigation, project case-study tabs, expertise, results, paginated credentials and email draft preparation.
- `content.js`: source-backed project and credential information.
- `world.js`: original canvas scenery, workers, animals, weather, seasons, sound and saved progression.
- `assets/`: optimized project screenshots, illustrated portrait, local fonts, résumé and certificates.
- `licenses/`: font licenses.

## Interaction

The dock and village labels open information without navigating a long page. Project and credential controls keep detail manageable on small screens. Escape returns to the village; arrow keys navigate tab groups. The document never scrolls. Panels allow internal scrolling only when needed on unusually short screens or with enlarged text.

World controls offer seasons, weather, night lights, pause and optional ambient sound. Sound starts off. Reduced-motion preferences start the world paused. Hidden browser tabs stop animation and progression. Local storage saves preferences, resources and building progress on the visitor's device; no location, account or backend is required. Woodcutter deliveries build a storehouse, then a new home.

The contact form prepares a `mailto:` draft for review in the visitor's email application. It does not transmit or store form submissions, and there is no booking provider configured. Direct email and social links remain available.

## Content provenance

Projects are independent products and concept websites. Feature counts describe inspected source implementations, not measured commercial outcomes. Rainora's current deployed video limitation is disclosed in its case study. Marketing figures are self-reported outcomes from the supplied résumé and are labeled separately from project work. Certificates and course completions retain their distinct labels; external verification links were transcribed from the supplied documents. The profile image is an illustration. No client testimonials were supplied or invented.

## Publish

Push to `main`. The single `.github/workflows/static.yml` workflow checks JavaScript syntax, uploads the website files and deploys to GitHub Pages. The former duplicate Jekyll deployment has been removed.
