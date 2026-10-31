---
title: 'Refonte du site Moto''s Cool (contenu, RDV, dépannage, légal, SEO, animations, perf)'
type: 'feature'
ticket: ''
created: '2026-10-31'
status: 'built'
baseline_revision: '1554944a3e3c88f5d560954aafbeb94c50143007'
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

**Problem:** The demo site the user will sell to the Moto's Cool garage (Vitry-sur-Seine, 94) has content the garage rejected: a sound intro, Diagnostic express and revision tools, 8 towing departments, an outdated FAQ. It also lacks what they asked for: a licence plate field and full vehicle info in the booking form, a towing zone map, pricing/guarantee/payment terms, legal pages and SEO.

**Approach:** Rework the single page `index.html` in place and keep its visual identity (dark, red, Orbitron/Nunito, GSAP). Add the new sections, the legal pages and the SEO files, and load heavy libraries lazily so the page stays fast.

## Boundaries & Constraints

**Always:**
- All text in French. Keep phone 01 43 76 26 38, address 15 ter av. du Président Salvador Allende 94400 Vitry-sur-Seine, opening hours (Mon–Fri 9:30–18:30, Sat 10:00–18:30).
- Towing zone = exactly 75 Paris, 77 Seine-et-Marne, 91 Essonne, 94 Val-de-Marne, everywhere it appears (services panel, stats, FAQ, JSON-LD, map).
- Booking form fields, mirroring the garage's email model: type (Moto/Scooter/Quad/Autre), plaque d'immatriculation (French format AA-123-AA, normalised to uppercase with dashes, old FNI format also accepted), marque, modèle, cylindrée, année, kilométrage, intervention; lieu (À l'atelier / À domicile, where the address is required and shown only for domicile), date, heure (opening days/hours only); nom, téléphone, email, message; RGPD consent checkbox linking to the privacy policy.
- No email sending. Submission builds one structured payload object and passes it to a single `sendToG8(payload)` function (stub that resolves, clearly commented "à brancher sur le logiciel G8"), then shows the confirmation screen with a recap.
- Legal placeholders appear as visible `[À COMPLÉTER : …]` markers.
- Respect `prefers-reduced-motion`; mobile-first layout must work at 360px width without horizontal scroll.
- Keep `<meta name="robots" content="noindex, nofollow">` (demo) with its comment saying to remove it at go-live.

**Never:** No used-bike, parts or equipment sales section. No real emails, external form services or analytics/trackers. No git push and no commit, since the orchestrator handles those. No chat or support widgets.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Booking at workshop | lieu=atelier, valid fields | address hidden and not required; payload has lieu "A l'atelier", adresse ""; confirmation shows name + date/heure | none |
| Booking at home | lieu=domicile, address in 94 | address required; check says inside zone | none |
| Home outside zone | domicile, postcode 92xxx | inline warning "hors zone de dépannage (75, 77, 91, 94) : appelez-nous" and submit blocked | message next to field |
| Bad plate | "1234" | field invalid, French error message | blocks submit |
| Zone checker | postcode 77300 / 93200 / "abc" | covered + reactive-delay text / not covered + phone / "code postal invalide" | inline message |
| Map lib fails to load | offline CDN | department list and postcode checker still work | map area shows fallback text |
</frozen-after-approval>

## Code Map

- `index.html` (single file, ~1265 lines, 77 KB). Head: meta/OG L1-18; JSON-LD `MotorcycleRepair` L20-40 (areaServed lists 8 depts, so fix it). CSS L42-441: intro L~100-140, hero/`#wheel` L190-200, tools L289-312, depts L319. Intro markup L446-452 (`#intro`, `#ignite`, `#skip`), and `<html class="locked">` is the scroll lock released by the intro. Menu L480-488 (remove `#outils` link). Hero `<canvas id="wheel">` L498. Services panels L529-536 (panel 03 says "8 départements", panel 01 "Entretien & révision" is a service and stays). Stats L546-553 (`data-count="8"` → 4). Tools section `#outils` L574-611 (delete). `#depannage` L613-633. Form `#quote-form` L647-677. FAQ L682-695 (Q2 zones text, Q5 RDV, Q6 delete). Footer L729-735 (add legal links). Scripts L743-1263: three r128 + gsap 3.12.2 + ScrollTrigger loaded synchronously; engine sound L763-806, intro L808-830, wheel Three.js L850-985 (`boost`, `scrollSpeed` reused by HUD L986), depts L1081-1094, diag L1152-1189, revision calc L1190-1215, day/slot picker L1216-1251 (reuse the logic), submit L1252-1260.
- `index-v1.html`, git-ignored old version. Do not touch.
- New files: `mentions-legales.html`, `confidentialite.html` (privacy + cookies), `robots.txt`, `sitemap.xml`, `assets/zone-depannage.geojson` (only depts 75/77/91/94, simplified, from gregoiredavid/france-geojson `departements-version-simplifiee.geojson`, kept under 60 KB).

## Tasks & Acceptance

**Execution:**
- [ ] `index.html` -- remove intro/audio (markup, CSS, JS, `locked` class), remove `#outils` + menu link + diag/revision JS/CSS; drop any dead code they leave -- garage request
- [ ] `index.html` -- replace the wheel with a Three.js rear-of-motorcycle model: tyre with tread, spoked rim, brake disc + caliper, swingarm, chain/sprocket, exhaust silencer, tail section with red LED tail light and plate. Animate it with slow rotation and wheel spin linked to scroll, plus a light glow. Lazy-init it after first paint (dynamic import or deferred script, `requestIdleCallback`), pause it off-screen, and show a static/reduced version for reduced-motion -- realistic hero
- [ ] `index.html` -- `#depannage`: Leaflet map (loaded lazily when the section nears the viewport) with the 4 department polygons highlighted and the workshop marker; department buttons for the 4 depts; postcode/commune checker (postcode prefix check, plus optional lookup via `https://api-adresse.data.gouv.fr/search/` when text is not a postcode, with graceful failure); copy on reactive intervention and on rates depending on zone and case -- towing request
- [ ] `index.html` -- new section "Tarifs, garantie & paiement": price set after an on-site diagnostic and a quote; repairs and sales under warranty; accepted means (contactless card, Revolut, cash, bank transfer) as badges; refused means (PayPal, cheque, instalments) as crossed-out badges -- garage request
- [ ] `index.html` -- new "En panne ? Moto's Cool arrive" story section: 4 animated SVG/CSS scenes driven by ScrollTrigger (1. bike breaks down by the roadside with smoke and hazard lights, 2. the rider searches "Moto's Cool" on the phone and calls, 3. the Moto's Cool van arrives, 4. the bike is repaired and rides off). Captions under each. Static frames for reduced motion -- user idea
- [ ] `index.html` -- rebuild the booking form per Boundaries; build the payload `{vehicule:{type,immatriculation,marque,modele,cylindree,annee,kilometrage,intervention},rdv:{lieu,adresse,date,heure},contact:{nom,telephone,email},message}`; call `sendToG8`; show the recap confirmation -- G8 integration point
- [ ] `index.html` -- FAQ: delete Q6; Q5 → "Peut-on venir sans rendez-vous ?", answered yes: come straight to the workshop during opening hours; Q2 → 75/77/91/94 only; add Q&As on prices, payment means and warranty. Footer: links to the legal pages and "Gestion des cookies" -- garage request
- [ ] `index.html` -- SEO: richer title/description/keywords-free meta, canonical `https://motoscool.fr/`, OG + Twitter tags, JSON-LD `MotorcycleRepair` with geo, areaServed (4 depts), paymentAccepted, priceRange, openingHours, hasMap, plus a `FAQPage` JSON-LD matching the visible FAQ, one `h1`, logical `h2`/`h3`, aria labels. Perf: `defer` on all scripts, Three.js/Leaflet loaded on demand, font `display=swap` kept -- referencing + latency
- [ ] `mentions-legales.html`, `confidentialite.html` -- same look (small inline CSS); LCEN mentions (editor, company form, capital, SIRET/RCS, TVA, director of publication, host name/address/phone, contact) with `[À COMPLÉTER]`; RGPD privacy policy (data collected by the form, purpose, legal basis, retention, recipients incl. G8 software, rights + CNIL); cookies section stating only technical storage and no trackers -- legal compliance
- [ ] `robots.txt`, `sitemap.xml`, `assets/zone-depannage.geojson` -- create -- SEO + map data

**Acceptance Criteria:**
- Given the page loads, then no intro overlay, no audio, and the page is scrollable immediately.
- Given any text on the site, then no mention remains of Diagnostic express, the revision calculator, "8 départements", or departments 78/92/93/95.
- Given a desktop browser, then three.js and leaflet are not requested before first paint (they are absent from the initial script tags).
- Given the browser console after load and full scroll, then no JavaScript errors appear.
- Given a 360px-wide viewport, then nothing overflows horizontally.

## Implementation Notes

## Plan Change Log

## Review Triage Log

Pass 1 (quick lens): high 0 / medium 2 / low 4 / false 0 / maybe-false 0, all routed to patch.
- medium, patch: submit handler `querySelector(':invalid')` hits a `<fieldset>` (the form has 3), so no field message or focus. Fix: query controls only.
- medium, patch: GeoJSON `fetch` fails under file:// (CORS), so no polygons and a console error when the demo is opened from disk. Fix: inline the GeoJSON.
- low, patch: zone checker catch path never says "code postal invalide" (matrix row "abc" offline). Fix: reword the catch message.
- low, patch: `flyToBounds` with `duration: 0` still animates (Leaflet treats 0 as falsy), breaking reduced motion. Fix: `fitBounds` when `reduce`.
- low, patch: `syncLieu()` not called at start-up, so a browser-restored "domicile" state gets out of sync. Fix: call it once.
- low, patch: `p.depcode` is not in the api-adresse schema (dead code). Fix: use the postcode prefix only.

## Design Notes

Lazy loading pattern (keep it simple, no bundler):
```js
const load = src => new Promise((ok, ko) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.append(s); });
new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); load(LEAFLET_JS).then(initMap).catch(showMapFallback); } }, { rootMargin: '400px' }).observe($('#map'));
```
Leaflet 1.9.4 from cdnjs (CSS + JS), OSM tiles with attribution. Three.js r128 from cdnjs stays, loaded lazily for the hero.

## Verification

**Commands:**
- `grep -nE "Diagnostic express|révision\?|8 départements|Yvelines|Hauts-de-Seine|Seine-Saint-Denis|Val-d'Oise|ignite|AudioContext" index.html` -- expected: no matches
- `python -c "import json;json.load(open('assets/zone-depannage.geojson'))"` (via `uv run`) -- expected: parses, 4 features
- Extract each `application/ld+json` block and `json.loads` it -- expected: valid

**Manual checks (if no CLI):**
- Open `index.html` in a browser (or headless): hero 3D bike rear renders, map shows 4 highlighted departments, form submits with the recap, legal links work.
