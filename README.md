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
- `journal.js`: validated local trees, notes, session counts and milestone history.
- `village-ui.js` / `village-ui.css`: the optional Village life window and replay controls.
- `assets/`: optimized project screenshots, illustrated portrait, local fonts, résumé and certificates.
- `licenses/`: font licenses.

## Interaction

The dock and village labels open information without navigating a long page. Project and credential controls keep detail manageable on small screens. Escape returns to the village; arrow keys navigate tab groups. The document never scrolls. Panels allow internal scrolling only when needed on unusually short screens or with enlarged text.

World controls offer calendar-aware seasons (or a manual season), weather, night lights, pause and optional ambient sound. The current clock changes the village rhythm: people work by day, play gathers by the pond in the afternoon and evening, temple visitors arrive at dawn or evening, and villagers shelter at night or in bad weather. The river, clouds, birds, trees, cattle, chickens, goats, ducks and pond fish are all animated in the canvas. Click a visible villager to meet them; click the pond, temple, cattle shelter or banyan for a small visual and sound response. Sound starts off, and click sounds use the browser's generated audio only after an interaction. Reduced-motion preferences start the world paused. Hidden browser tabs stop animation and progression. Local storage saves preferences, resources and building progress on the visitor's device; no location, account or backend is required. Woodcutter deliveries build a storehouse, then a new home.

## Village life

The bottom-left Village life button opens four small experiences:

- **People:** Ravi, Meera, Kabir and Tara have fictional biographies and greetings. Asha arrives with the new home. Click a visible villager or choose one from the accessible resident list. Every fifth greeting reveals a small surprise.
- **Plant a tree:** up to six trees carry the visitor's initials and become part of the landscape. They grow with village days and follow the seasonal palette.
- **Notes:** a private local board holds up to twelve notes, with names of up to 24 characters and messages of up to 140. Notes are rendered as text, can be paged through and can be removed. On phones, Write and Read views keep the board inside one screen.
- **Time-lapse:** an eight-second, read-only replay samples up to eight saved milestones. It temporarily shows historical village states, then restores the live resources, characters, preferences and clock. It never awards resources or writes historical frames back to storage. Changing a setting, leaving the tab or choosing Return to now cancels the replay safely.

Each season has an event during three days of an eight-day village cycle: a spring market, summer kite afternoon, autumn harvest or winter lantern evening. An autumn fox and an occasional night shooting star reward a closer look. Optional sound uses quiet generated daytime bird phrases and nighttime cricket phrases; it requires an explicit click and stops when paused or hidden.

Trees and notes are saved **only in the current browser**, not shared publicly. Clearing browser storage removes that local history. If storage is blocked, these features continue for the session and the interface says so. The visit label counts this browser's tab sessions, not unique visitors or total site traffic. No analytics service, global visitor counter, public guestbook or backend has been configured. A public version would need shared storage and moderation.

The journal uses `akhil.pixelVillage.journal.v1`; the existing simulation uses `akhil.pixelVillage.v1`. Inputs and restored schemas are validated and bounded. History retains the first snapshot and the latest 89 milestones. Assets are hand-drawn in canvas/SVG, with no external tile downloads. Animation uses one main requestAnimationFrame loop capped at 30 fps, bounded characters and weather particles, a cached static layer, and no progression while the page is hidden. Only the selected project screenshot is mounted; the portrait loads lazily.

The contact form prepares a `mailto:` draft for review in the visitor's email application. It does not transmit or store form submissions, and there is no booking provider configured. Direct email and social links remain available.

## Content provenance

Projects are independent products and concept websites. Feature counts describe inspected source implementations, not measured commercial outcomes. Rainora's current deployed video limitation is disclosed in its case study. Marketing figures are self-reported outcomes from the supplied résumé and are labeled separately from project work. Certificates and course completions retain their distinct labels; external verification links were transcribed from the supplied documents. The profile image is an illustration. No client testimonials were supplied or invented.

## Publish

Push to `main`. The single `.github/workflows/static.yml` workflow checks JavaScript syntax, uploads the website files and deploys to GitHub Pages. The former duplicate Jekyll deployment has been removed.
