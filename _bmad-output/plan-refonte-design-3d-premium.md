---
title: 'Refonte design « premium 3D » du site Moto''s Cool'
type: 'feature'
ticket: ''
created: '2026-11-01'
status: 'built'
baseline_revision: '397a88465e69b49f46b956718e92393e20056fb0'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The user wants the site to look like the reference videos (frames in `frames/v1`, a BMW M site; `frames/v2`, "Websites in 2026"). Those sites have a realistic 3D product the camera tours as you scroll, a colour configurator, giant full-screen figures, a "your car in one sentence" input with an elegant model picker, light trails that form the logo, smooth scrolling and kinetic typography. The current site has a basic procedural three r128 bike rear and classic sections.

**Approach:** Replace the hero 3D with a much more realistic full side-view sport bike, built with modern three.js (ES module, physical materials, studio environment). Reuse that bike in a scroll-pinned "tour" that zooms on its parts, each stop presenting a service. Add the paint configurator, the giant-figure sequence, the one-sentence booking entry, the hero light trails, Lenis smooth scroll and line/word mask reveals. Keep every existing content block and rule.

## Boundaries & Constraints

**Always:**
- All text in French.
- Keep every existing section, its facts and its rules:
  - zones 75/77/91/94;
  - no price anywhere;
  - payment, warranty and walk-in wording;
  - the booking form fields, `sendToG8`, validation, the `SITE` config and the chatbot;
  - JSON-LD, the `noindex` demo meta, and the legal, zone and service pages.
- Giant figures use only facts already on the site: 4 départements, 6 jours sur 7, 10 marques, 100 % techniciens diplômés.
- Heavy code (three.js, the bike, Lenis) loads lazily, with the same rule as today:
  - mobile or save-data: on the first gesture;
  - desktop: after load, when idle.
- `prefers-reduced-motion`:
  - no Lenis, no light trails;
  - one static 3D frame, or no 3D;
  - the tour becomes a plain readable list of the service cards.
- Without WebGL or JavaScript, every service text stays visible and readable.
- At 360px: no horizontal scroll. Mobile uses a lower pixel ratio and no real-time shadows.
- No console errors.
- Bump `VERSION` in `sw.js`.
- Optional GLB: when `SITE.bikeModel` (default `''`) holds a URL, load it with GLTFLoader in place of the procedural bike; otherwise make no request. Paint swatches then tint any mesh whose material name contains "paint".

**Never:**
- No sound and no blocking intro overlay: the garage removed the old sound intro.
- No fake data: no ratings, no speeds, no prices.
- No new trackers.
- No bundler or build step. Plain static files on GitHub Pages.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Paint swatch | click "Noir mat" | bike paint in hero and tour changes; swatch `aria-pressed` true | none |
| One-sentence booking | "mes freins grincent" + brand Yamaha + Continuer | form `marque`=Yamaha, `intervention`=Freinage, `message` filled with the sentence, first empty required field focused | empty sentence → inline hint, nothing filled |
| Keyword mapping | frein→Freinage, pneu→Pneus, vidange/révision/entretien→Entretien, démarre/panne/voyant→Diagnostic, remorqu/dépann→Dépannage, else Réparation | intervention set accordingly | none |
| Tour scroll | scroll through pinned tour | camera moves between 6 stops, matching card shown | WebGL fails → cards shown as list |
| three CDN offline | import fails | hero keeps gradient, tour shows the card list | silent catch |

</frozen-after-approval>

## Code Map

- `index.html`, about 2,356 lines. All CSS and the main script are inline.
  - Head: preconnect at L35; JSON-LD at L41–93; CSS for `#bike3d` at L216.
  - Hero: L713–730, with canvas `#bike3d`, h1 letters `.split` and `.fade`.
  - `#services`: horizontal pinned carousel `#hs-track` at L742–755. It holds 6 `.hpanel` (Entretien, Réparation, Dépannage, Diagnostic, Freinage & pneus, Scooters) with `data-presta` buttons. Turn it into the tour and keep these articles as the tour's cards.
  - Stats: L764–772, `.stat` with `data-count`. This becomes the giant-figure sequence.
  - `#devis`: L1041 onwards. Fields used by the one-sentence entry: `#brand-select` (filled from `BRANDS`), `#intervention`, `textarea[name=message]` at L1127.
  - Script: `load()` and `loadCss` at L1304; `THREE_JS` r128 at L1306.
    - `BRANDS` at L1315 is used for the brand picker.
    - `boost` and `scrollSpeed` at L1326: `boost` is set to 1 on form submit and drives the HUD.
    - `initBike()` at L1349–1639: delete it, but reuse its lazy start rule (`startBike`, `lightMode`) at L1640–1649.
  - GSAP block (`if (hasG && !reduce)`), around L2250:
    - the `#services` horizontal `matchMedia` pin: replace it;
    - `[data-count]` counters;
    - `.rv` reveals;
    - the 4 story scenes: keep them.
  - Leaflet `#map` at L953 and the chatbot in `assets/assistant.js` (`.mc-log` scrolls): mark both `data-lenis-prevent`.
- `sw.js`: bump `VERSION` (currently `v2-2026-11-01`). It intercepts cdnjs only, and jsdelivr passes through. Add `cdn.jsdelivr.net` to the CDN cache rule.
- New file `assets/bike3d.js`, an ES module. It builds the bike, the renderers and the tour camera, and exposes `window.MC3D` = `{ setPaint, boost }`.

## Tasks & Acceptance

**Execution:**
- [x] `assets/bike3d.js`: build the bike module.
  - Import three@0.160.0 from jsdelivr through an importmap. Use `RoomEnvironment` + `PMREMGenerator`.
  - Procedural full side-view sport bike with real proportions:
    - tyres with tread, spoked or cast rims, brake discs with calipers;
    - fork, swingarm, engine block with fins, exhaust;
    - tank and fairing in clearcoat paint, seat, headlight, tail light, chain.
  - Materials: `MeshPhysicalMaterial` with clearcoat paint, metal for chrome, emissive for the lights. A soft contact shadow made from a radial-gradient plane.
  - Hero renderer: slow idle turntable, mouse parallax, wheel spin with `boost`.
  - Tour renderer: `model.clone()` shares materials, so paint applies to both. It exposes `tour(progress)`, which interpolates the camera through 6 stops: overall view, front brake/wheel, engine, chain/transmission, cockpit/headlight, rear 3/4.
  - Pause rendering off-screen and when the tab is hidden. DPR capped at 1.5 on mobile and 2 on desktop.
  - Optional GLB through GLTFLoader when `SITE.bikeModel` is set.
- [x] `index.html`: the page changes.
  - Add the importmap.
  - Hero: add a light-trails `<canvas>`. Red and white streaks converge behind the title for about 1.6 s, then fade. No sound, no blocking.
  - Add the paint swatches "Ta moto": Rouge Moto's Cool, Noir mat, Blanc nacré, Bleu, Vert.
  - Replace the `#services` horizontal carousel with the pinned tour: a 3D canvas on one side and the matching `.hpanel` card on the other. Stops map to Freinage & pneus, Réparation (moteur), Entretien (chaîne), Diagnostic (électronique), and Dépannage + Scooters together.
  - Turn the stats into a pinned giant-figure sequence, one figure per screen, with counters.
  - Add the "Ta moto en une phrase" block above the form: a large input, a custom accessible brand listbox (`BRANDS` + "Autre") and a "Continuer" button that prefills the form per the matrix.
  - Lenis smooth scroll, synced with ScrollTrigger and anchor links. Mask reveals on h2.
  - Remove the r128 code.
  - Mark Leaflet and the chatbot log `data-lenis-prevent`.
- [x] `assets/assistant.js`: add `data-lenis-prevent` on the scrollable log and panel.
- [x] `sw.js`: bump `VERSION` to `v3-2026-11-01`; add jsdelivr to the CDN cache rule.

**Acceptance Criteria:**
- Given the desktop hero, when the page is loaded, then a recognisable full sport bike with glossy paint and metal parts is rendered, and the title is drawn by light trails without any overlay.
- Given the tour, when scrolling, then the camera visibly zooms on brakes, engine, chain and cockpit in turn, and the related service card is displayed with its "Réserver" button still working (`data-presta` preselects the intervention).
- Given reduced motion, then there is no smooth scroll and no trails, and every service card and figure is readable without scrolling tricks.
- Given a 360px mobile, then there is no horizontal overflow, the initial load does not request three.js before the first gesture, and nothing errors in the console.

## Design Notes

- Lenis 1.1.x UMD from `cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js`:
  - `lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);`
  - Anchor links go through `lenis.scrollTo(target, { offset: -80 })`.
- The tour is driven by one ScrollTrigger (`pin`, `scrub`, `end: '+=500%'`). `onUpdate: st => MC3D.tour(st.progress)`, and the active card index is `Math.round(progress * 5)`.
- Visual tone: dark studio background, red rim light, white key light. Restrained, premium and clean, never gimmicky.

## Verification

**Commands:**
- Headless puppeteer script (pattern: the scratchpad `story.js`) at 1400×900 and 360×740:
  - console errors are empty;
  - `scrollWidth` ≤ `clientWidth`;
  - take screenshots of the hero, the tour at 3 progress values, the figures and the one-sentence booking.
- Extract every `application/ld+json` block and parse it: expected valid.

**Manual checks:**
- Inspect the screenshots: the bike reads as a realistic sport bike, and the layout is clean and professional.

## Implementation Notes

Owner constraints received during implementation (they override visual choices of the plan):

1. **Help first.** A customer broken down on the roadside must reach help instantly: the header phone button (desktop), the mobile sticky "Je suis en panne / Rendez-vous" bar and the hero CTAs stay visible and one tap away at all times.
2. **Nothing delays or hides content.** Hero text and CTAs are visible on first paint (no letter-by-letter hide/reveal any more); the light trails are strictly decorative behind the title. Nothing waits for the 3D.
3. **Short pins.** Desktop tour scrubs over `+=250%` (not 500 %). Mobile (≤ 760 px): no pin for the tour nor the giant figures; cards and figures are a normal vertical flow, and the tour has no 3D on mobile.
4. **Lenis** lerp 0.12, desktop only (fine pointer, not light mode, no reduced motion). Anchor links go through `lenis.scrollTo(target, { offset: -80 })`; the sticky bar is mobile, so it stays native.
5. **One-sentence booking** stays one input + one brand picker + one button; the classic form works on its own.
6. **Background only** ("juste en fond"): the bike, trails and effects are a backdrop. Hero bike sits beside/behind the text, toned down by a left-side scrim; on desktop the tour cards are the foreground and the camera moves softly behind them. Paint swatches are a small discreet control. Giant figures are short on desktop and normal flow on mobile. When in doubt, less animation.
7. **Visual fidelity ("4K")**, applied in `assets/bike3d.js` with quality tiers (`high` = desktop with > 4 cores and no save-data; `mid` = other desktops; `low` = mobile):
   - ACES filmic tone mapping, sRGB output, MSAA, DPR up to 2 on desktop (1.5 on mobile), PMREM `RoomEnvironment`.
   - `high` tier: EffectComposer + UnrealBloomPass (low strength, high threshold) + OutputPass on an MSAA half-float target; the view then renders an opaque studio-gradient background that matches the CSS one.
   - Studio lights: RectAreaLight soft key (desktop), shadow-casting directional, red rim lights, cool fill; soft contact-shadow texture; dark glossy floor with radial fade (desktop receives real-time shadows); drifting dust particles; light exp fog.
   - Bike detail: lathe tyres with procedural tread normal map (no lettering), cast 5×2-spoke rims, drilled discs (extruded shapes with holes) on floating carriers, gold anodised radial calipers, USD fork with gold sliders, finned engine, heat-tinted headers (iridescence + gradient map), brushed muffler (anisotropy + roughness stripes), carbon-fibre canvas texture on fender/hugger/end cap, stitched seat (canvas height → normal map), real chain links (instanced plates + rollers).
   - Adaptive quality: if the average frame time is > 20 ms, DPR steps down (to 1), then bloom is switched off. Rendering only when visible and the tab is shown.
8. **Production GLB path** (expected model: "Three Cylinder Naked Street Bike" by jamie3d, CC-BY, compressed with gltf-transform meshopt + webp):
   - GLTFLoader with `MeshoptDecoder` and `DRACOLoader` (decoder path on jsdelivr three@0.160.0). Loaded only when `SITE.bikeModel` is set; no request otherwise.
   - Auto-fit: longest horizontal axis turned to X, `SITE.bikeRotationY` added, scaled to the procedural bike length, centred on the floor.
   - Tour stops are expressed in normalised bounding-box coordinates, so they fit both bikes.
   - Paint: materials whose name contains one of `SITE.bikePaintMaterials` (default `['paint']`), else auto-detected mostly-red materials; the colour is multiplied over the original textures ("Rouge" restores the original colour).
   - The procedural bike shows first, then a short canvas fade swaps in the GLB (no layout jump). Shadows/env apply to GLB meshes.
   - CC-BY credit: `SITE.bikeCredit` (`{ text, url }`) lives in the shared file `assets/site-bike.js` (read by `index.html` into `SITE` and by `mentions-legales.html`, which shows a "Crédits" section only when it is set).
9. **Delivered model** (replaces the jamie3d candidate): "2021 Ducati Panigale V4 SP" by Gratisphile, CC BY 4.0, logos removed from the livery.
   - `SITE.bikeModel = { desktop: 'assets/moto.glb', mobile: 'assets/moto-mobile.glb' }` (mobile file also for save-data). GLTFLoader + MeshoptDecoder only (no Draco). Same lazy rule. Load failure → procedural bike. When a GLB is configured nothing is shown until it is loaded (no procedural-then-swap), so there is no double cost and no layout jump.
   - Materials: `mat_light160` gets `emissiveMap = map` and intensity 2.4 (bloom); `mat_glass160` is turned into smoked translucent glass (it ships as alpha MASK, which rendered as an opaque white slab).
   - Tour stops use mesh bounding boxes (front tyre, chain, cockpit) with the normalised box as fallback; the camera stays on the chain side.
   - Paint: `mat_livery_0_160_001` patched with `onBeforeCompile`: low-saturation (< 0.12) texels with sRGB luma 0.08–0.30 are mixed toward `uPaint × luma / 0.149`. Swatches: Noir carbone (default, original look), Rouge, Blanc nacré, Gris titane, Bleu nuit.
   - Credit text and source URL set in `assets/site-bike.js`, shown only in `mentions-legales.html` → "Crédits". The main page never shows the model's brand name (the only "Ducati" on it is the pre-existing list of serviced brands).
   - `sw.js`: `.glb` is not precached; it is cached at runtime, cache-first, same origin.
10. **Signature effects** (desktop + GLB; mobile keeps the light version; reduced motion gets the static frame):
   - Particle assembly reveal: ~52k points (30k on the `mid` tier) sampled with `MeshSurfaceSampler`, additive red/white `ShaderMaterial`, swirl and converge over 1.8 s; then a laser-scan dissolve along X reveals the PBR bike (`onBeforeCompile` discard + emissive edge) while the particles behind the line fade. Once per session (`sessionStorage`), skipped instantly on wheel / pointerdown / keydown / touchstart / scroll. Shadows are off during the reveal. Mobile: plain canvas fade.
   - X-ray: around the engine stop the livery and glass blend into a Fresnel blue-white shell (transparent, no depth write), scroll-scrubbed and reversible.
   - Exploded view at the same "Réparation (moteur)" stop: bodywork lifts 10 cm, exhaust moves out and down, tyres slide out sideways; scrubbed and reversible. Limitation: the GLB merges both rims and both brake discs into single meshes, so whole wheels cannot be separated; the tyres move instead.
   - Studio light rig follows the cursor softly (RectAreaLight + key light), so reflections sweep the clearcoat.
   - High tier post: UnrealBloom (low strength, threshold 0.92) + vignette + animated film grain (custom `ShaderPass`). No depth of field (cost and sharpness).
   - Adaptive quality: a 2-second fps probe at start; below 50 fps → DPR down, bloom off, particle draw range halved. The ongoing > 20 ms average check remains.

11. **Review fixes:** material lists kept in a module WeakMap (cheap clone); GLB wheels spin on pivots (tyres + rim mesh split front/rear by triangle; the merged brake mesh stays static); materials matching `SITE.bikePaintMaterials` get a multiplied tint besides the livery shader; tour and figure pins live in `gsap.matchMedia('(min-width: 761px)')` and revert below; the tour WebGL view is created only by `MC3D.startTour()`; scan/x-ray uniforms are set per view just before each render; `sw.js` answers first and caches in the background; on mobile the chat button is smaller and hidden until the hero is scrolled past.

## Plan Change Log

## Review Triage Log

Pass 1 (quick lens) : high 0 / medium 4 / low 4 / false 1 / maybe-false 0, all real findings routed to patch.
- medium, patch: `bike3d.js` `model.clone()` deep-copies `userData` (paintMats/xrayMats), so live materials are serialised to JSON (textures as data URLs) on the main thread. Fix: keep those arrays outside `userData`.
- false: `setXray` cannot become see-through. Refuted: the `d-tour-0.4.png` screenshot shows translucent bodywork, and `patchMaterial` sets `needsUpdate` (bike3d.js L565).
- low, patch: no wheel spin or `boost` with the GLB (`v.wF` missing). Fix: spin the tyre and rim meshes around their own centres.
- low, patch: the GLB paint ignores `SITE.bikePaintMaterials` (frozen rule "tint material name containing paint"). Fix: also tint materials whose name matches the list.
- medium, patch: pinned tour and figures are never reverted on resize below 761px. Fix: `gsap.matchMedia` with a revert.
- low, patch: an unused tour renderer is built when the tour is never enabled. Fix: create the tour view lazily, in `enableTour`.
- low, patch: hero and tour share the scan/x-ray uniforms. Fix: set uniforms per view before each render.
- medium, patch: sw.js `cacheFirst` awaits `cache.put` before responding, so the first 3D load is delayed. Fix: return the response and cache in the background.
- medium, patch (orchestrator screenshot `m-hero.png`): the mobile chat button overlaps the hero "Appeler maintenant" CTA. Fix: keep the chat bubble clear of the hero CTAs and the sticky bar.
