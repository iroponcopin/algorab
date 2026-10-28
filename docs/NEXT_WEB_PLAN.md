# Corvus NEXT (V10174): web platform plan (Phase 4)

Scope: replace the visual layer of the whole public site with the Corvus NEXT design. Content, data pipeline, 13 languages,
hreflang/SEO, the contract files and `npm run apply` rules are unchanged. "V10174" is a display name only.

## Architecture found
- `web/` is a Next.js 15 static export (basePath `/corvus-dev`, `[lang]` segment, `ja` at the root). Page content comes from
  `web/.data/wiki.json` (written by `scripts/extract_wiki.py`) and the i18n files in `web/src/i18n/`.
- Chrome: `Dock` (header), `Footer`, `Palette`; the 3D stage (`engine/`) is used only by the Skin page; the recipe Tome has its own canvas.
- Styles: `app/globals.css` (tokens + base) and `styles/{chrome,home,pages,models,tome}.css`, all on `.ac-*` classes.
- Gates: `typecheck`, `lint --max-warnings 0`, `build`, `check:export`, `apply` (needs committed sources), `scripts/check_site.py`.

## Plan
1. Design engine (`web/src/design/`): spring solver (closed-form step, reference integrator for tests), frame driver, pointer
   field (caustics, press, magnet), Island engine and physics, `useSpringIn`.
2. Tokens and glass: `styles/tokens.css`, `styles/glass.css` (four-layer Optical Glass Stack, fallbacks for reduced
   transparency, increased contrast, forced colours), `styles/island.css`, `MetaballFilter` (`#corvus-liquid-metaball`).
3. Chrome and pages: new base (`globals.css`), header, footer, palette, 404; the page stylesheets are re-tokened and their
   panels brought onto the glass recipe (`styles/surfaces.css`); the home becomes the Island hero plus a spatial bento.
4. i18n: `i18n/island.ts` in 13 languages (en, ja careful; the other 11 flagged unreviewed).
5. Gates, then real-browser proof (screenshots, frame-time trace) saved under `Update/Corvus_NEXT_V10174/captures/web/`.

## Rules kept
No `// TODO`, no stock glass utilities, no linear/eased CSS transition on an interactive surface, no network or publish
action, sample data only ("Alex Morgan"), `Corvus Island` never translated.
