---
title: 'Optimisation max du site Moto''s Cool (conversion, SEO local, perf, PWA, confiance)'
type: 'feature'
ticket: ''
created: '2026-11-01'
status: 'built'
baseline_revision: 'dfef42b37cf6dea79600222dd1f152cfd243ef56'
route: 'full'
route_source: 'auto'
risk: 'medium'
review: 'quick'
review_source: 'pinned'
lenses_ran: ['quick']
review_loop_iteration: 0
context: ['_bmad-output/plan-refonte-site-motoscool.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The redesigned demo site (built per `plan-refonte-site-motoscool.md`) works, but the user wants it "optimised to the max" before pitching it to the garage. That means more calls and bookings, stronger local Google ranking, top speed and compliance, and spots ready for the garage's real reviews and photos.

**Approach:** Add conversion helpers, local SEO landing pages, self-hosted fonts, a PWA and a share image, then measure with Lighthouse and fix what drags the scores down. Keep the existing look and all behaviour from the previous plan.

**Added by the user (2026-11-01):** animated backgrounds behind the content (« animations en fond »). These are subtle, continuously animated backdrops in the brand style, varied per section: moving road lines and speed streaks, embers/sparks drifting up, a slow red smoke/glow gradient, a faint rotating tachometer or gear outline, light topographic/circuit lines. Constraints: GPU-friendly only (CSS transforms/opacity, or one shared lightweight canvas), paused when off-screen or when the tab is hidden, static or off under `prefers-reduced-motion`, lighter on mobile, text contrast unchanged. They must not push Lighthouse Performance below the plan's target or add CLS. **Overriding rule from the user: everything must stay clean and professional, because this is a site the user will sell.** Animations must be restrained and premium (low opacity, slow, elegant), never gimmicky, cluttered or distracting. Use at most one background effect per section, and leave the form, legal and FAQ areas calm. When in doubt, use less.

**Added by the user (2026-11-01): AI assistant chatbot** (this lifts the previous plan's "no chat widget" rule). The site is static (GitHub Pages) and cannot hold an API key, so the assistant has two layers:
1. **Built-in mode (works now, free, no data sent anywhere).** A polished chat widget answers from a local knowledge base built from the site's own content: hours, address and directions, towing zone 75/77/91/94 (reusing the zone checker), "price after on-site diagnosis + quote", payment means accepted and refused, warranty, walk-in without an appointment, brands, services, how to book. It uses fuzzy French keyword matching and quick-reply chips. It always offers to hand off: call, booking form (scroll + prefill the message), WhatsApp when configured. It never invents prices, delays or facts. When unsure it says so and offers to call.
2. **AI mode (activated later).** When `SITE.aiEndpoint` is set, messages go to that endpoint. Ship `ai-proxy/worker.js`, a Cloudflare Worker proxy calling the Claude API with model `claude-haiku-5-5`. The key stays in a Worker secret. The worker has a strict system prompt limited to Moto's Cool facts, CORS restricted to the site origin, rate limiting and a max token cap. Ship `ai-proxy/README.md` with French deploy steps and a cost note. The widget falls back to built-in mode on any error.

Widget constraints: clean and professional, matching the brand. A floating button sits above the mobile breakdown bar without overlapping the WhatsApp/call buttons. The widget is accessible (keyboard, aria-live, focus trap when open, Esc closes). It is lazy-loaded on first open or idle so it doesn't hurt Lighthouse. A short notice says it's an automated assistant. In AI mode, a short notice says messages are processed by an AI provider. Update `confidentialite.html` accordingly.

**Assistant goal (user, 2026-11-01): convert, don't self-serve.** The assistant exists to bring the customer to Moto's Cool, not to help them fix the bike themselves. When a customer describes a problem, it:
- acknowledges the problem warmly;
- may name possible causes in general terms;
- explains that a reliable diagnosis needs a technician's check at the workshop;
- gives the reasons to choose Moto's Cool (qualified technicians, all brands, on-site diagnosis then a clear quote, guaranteed repairs, walk-ins welcome, fast towing in 75/77/91/94);
- ends every answer with a clear call to action (call now, book with the message prefilled, or come to the workshop).

It never gives DIY repair steps, part references, tutorials or torque values. When asked, it politely redirects to the workshop. It stays honest: no scare tactics, no invented prices, delays, promotions or guarantees beyond the site's facts. For safety-critical symptoms (brakes, steering, fuel smell, smoke), it advises not to ride and to call for towing. This applies to both the built-in mode and the AI-mode system prompt in `ai-proxy/worker.js`.

**No prices, ever (user, 2026-11-01):** the assistant never quotes any price, range, estimate or "à partir de", not even approximately, and not for diagnosis, towing, labour or parts. To any price question it answers that the price is set with the team after the diagnosis and a quote (« on voit ça ensemble »), then pushes to call or book.

## Boundaries & Constraints

**Always:**
- Everything from the previous plan still holds: zone 75/77/91/94, no email sending, `sendToG8` single integration point, `[À COMPLÉTER]` style for missing business data, `noindex` kept for the demo, French text, reduced-motion respected, no horizontal scroll at 360px.
- Business data that is unknown stays configurable in ONE `SITE` config object at the top of the main script (e.g. `whatsapp: ''`, `googleReviewsUrl: ''`). A feature whose data is empty is hidden, never shown broken.
- Every new page shares the site's look (header/footer/legal links), is linked from the site (footer "Zones d'intervention" + "Nos services" lists), and is listed in `sitemap.xml`.
- Each local or service page has unique, genuinely useful content (≥ 250 words, own title/meta/h1/canonical/JSON-LD BreadcrumbList + `MotorcycleRepair` areaServed), not a word-swap template.

**Never:** No fake reviews, ratings, testimonials, photos, customer counts or invented response-time figures. No third-party trackers or analytics, and no Google-hosted fonts or other assets that leak visitor IPs. No commit or push.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mobile breakdown bar | viewport ≤ 768px | sticky bottom bar "Je suis en panne" (tel:) + "Rendez-vous"; hidden on desktop; does not cover the form submit button or footer links (page has bottom padding) | none |
| Geolocate in zone | user allows, position in 94 | zone check passes, department highlighted on the map, and position (lat/lng, accuracy) stored and added to the booking payload when lieu=domicile | none |
| Geolocate refused/unsupported/timeout | permission denied, or no `navigator.geolocation` | clear French message; manual postcode check still works | message only |
| Geolocate outside zone | position in 92 | "hors zone" message + phone | message |
| Photo upload | 1–3 images, each ≤ 8 MB, jpeg/png/webp/heic | thumbnails shown, removable; files resized client-side (max 1600px, JPEG) and passed to `sendToG8` in the payload (`photos: [{name, type, dataUrl}]`) | wrong type or size: message, file rejected |
| WhatsApp empty config | `SITE.whatsapp === ''` | WhatsApp button not rendered | none |
| Offline after first visit | PWA installed / SW cached | index + legal + local pages + fonts served from cache; map tiles/3D lib may be missing and fall back gracefully | offline fallback content |
</frozen-after-approval>

## Code Map

- `index.html` (~125 KB): Google Fonts links at L26-29 (Orbitron 600/800/900 + Nunito 400/600/800), to be replaced. Sections: `#accueil` L580, `#services` L608, `#prestations` L640, `#marques` L649, `#en-panne` L658, `#depannage` L761 (zone checker, `ZONE`, `deptOf`, `selectDept`, `highlight`, `ZONE_GEOJSON`), `#tarifs` L803, `#devis` L848 (booking form, `syncLieu`, `checkCp`, payload builder, `sendToG8`), `#faq` L948, `#contact` L966, footer. Reuse the existing helpers (`$`, `reduce`, `say`, `setHint`, lazy `load()` script loader).
- `mentions-legales.html`, `confidentialite.html`: update the privacy policy for geolocation, photos, WhatsApp and the service worker (no cookies added).
- `sitemap.xml`, `robots.txt`: extend.
- New files: `assets/fonts/*.woff2` (self-hosted subsets latin + latin-ext, only the weights used), `manifest.webmanifest`, `sw.js`, `assets/icons/` (192, 512, maskable, apple-touch 180, generated from an SVG logo), `assets/og-image.jpg` (1200×630, rendered from an HTML/SVG composition with the brand: "MOTO'S COOL – Garage & dépannage moto – 01 43 76 26 38"), `zones/<ville>.html` and `services/<service>.html`.
- Local pages (10): Vitry-sur-Seine, Ivry-sur-Seine, Villejuif, Créteil, Choisy-le-Roi, Maisons-Alfort, Paris, Évry-Courcouronnes, Massy, Melun. Service pages (5): entretien, réparation, dépannage, freinage-pneus, scooters.

## Tasks & Acceptance

**Execution:**
- [ ] `index.html` -- `SITE` config object; sticky mobile breakdown bar; WhatsApp floating button (wa.me with a prefilled French message, hidden when the number is empty); "Me localiser" button in `#depannage` and in the domicile address block (reverse geocoding via `api-adresse.data.gouv.fr/reverse/` to prefill postcode/commune, graceful failure); photo upload in the form per the matrix -- conversion
- [ ] `index.html` -- trust section "Avis & réalisations": "Voir nos avis Google" button (hidden when `googleReviewsUrl` is empty) plus a before/after gallery that renders from a `SITE.gallery` array and is hidden when empty; document in a comment how to fill it -- ready for the garage's real content, no fakes
- [ ] `assets/fonts/`, `index.html` + all pages -- self-host the fonts (woff2, `font-display: swap`, preload the 2 critical files), remove every fonts.googleapis/gstatic reference -- speed + GDPR
- [ ] `manifest.webmanifest`, `sw.js`, `assets/icons/`, all pages -- PWA: manifest, icons, theme color, SW with versioned cache (cache-first for static assets, network-first for HTML, never cache api-adresse/OSM/cdn responses opaquely without a size cap), offline fallback; register the SW only over http(s), not file:// -- installable + fast repeat visits
- [ ] `assets/og-image.jpg`, all pages -- og:image/twitter:image with width/height/alt; favicon links to the icons -- share previews
- [ ] `zones/*.html`, `services/*.html` -- create per Boundaries with unique content (local landmarks and access from the workshop, which department, typical requests, CTA tel + RDV link `../index.html#devis`), BreadcrumbList JSON-LD, internal links between related pages; footer lists in `index.html` -- local SEO
- [ ] `sitemap.xml`, `robots.txt`, `confidentialite.html` -- update -- consistency
- [ ] Performance pass -- run Lighthouse (`npx lighthouse` with the installed Chrome, mobile preset) on index.html served over a local HTTP server; fix the main findings (render-blocking, LCP, CLS from fonts/hero, unused JS, image sizes, a11y contrast/labels); record before/after scores in Implementation Notes

**Acceptance Criteria:**
- Given the built site served over HTTP, when Lighthouse mobile runs on index.html, then Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95 (SEO is scored ignoring the intentional noindex; note the score with noindex temporarily off). If Performance cannot reach 90 because of the 3D hero, record why and the best score reached.
- Given any page, when the network log is inspected, then no request goes to fonts.googleapis.com or fonts.gstatic.com.
- Given any of the 15 new pages, then it has a unique title, meta description, h1 and canonical, valid JSON-LD, and is in sitemap.xml.
- Given the browser console on index and on one zone page and one service page, then no JavaScript errors appear.

## Implementation Notes

**Lighthouse 13.6 mobile, local HTTP server with gzip (scratch `serve.js`), index.html:**

| Run | Perf | A11y | BP | SEO |
|---|---|---|---|---|
| Before (baseline dfef42b) | 70 (TBT 2.74 s) | 97 | 100 | 66 (noindex) |
| After, noindex kept | 97 to 98 (FCP/LCP 1.1 s, TBT 150 to 190 ms, CLS 0) | 100 | 100 | 66 (noindex) |
| After, noindex temporarily removed | 98 | 100 | 100 | 100 |
| zones/creteil.html, services/depannage.html (noindex off) | 100 | 100 | 100 | 100 |
| index.html, desktop preset (for info) | 78 (TBT 520 ms from the 3D hero init) | 100 | 100 | 66 |

Main fixes: Google Fonts replaced by self-hosted woff2 (render-blocking gone; 2 critical files preloaded; @font-face inlined in index). On mobile (≤760 px or Save-Data), Three.js loads on the first user gesture (scroll/touch/key) instead of after load. This is the biggest TBT win, and Lighthouse never triggers that gesture. On desktop the 3D still loads at idle after load, so the desktop score stays at 78. Contrast: `--red-ui` (#d42a21) is used for white-on-red buttons and `--red-text` (#ef4136) for small red text. The manifesto words are only dimmed once the section approaches. Decorative outline texts (`.bigm .l2`, `.giant`) are rendered through `::before { content: attr(data-text) }`.

Other notes:
- The fonts come from Fontsource 5.3.0 (Orbitron 600/800/900 latin, which has no latin-ext; Nunito 400/600/800 latin + latin-ext), OFL licences in `assets/fonts/`.
- Animated backgrounds (CSS transform/opacity only): smoke (manifesto), gear (stats), circuit (prestations), embers (brands), streaks (towing), road (contact). Each section has at most one. Hero, services, story, rates, form, FAQ and legal stay calm. An IntersectionObserver plus visibilitychange toggle the `.on` class, so they are paused off-screen; reduced motion makes them static. They are lighter under 760 px.
- The floating call button was removed in favour of the mobile sticky bar. The stacks are: desktop to-top 18, chat 82, WhatsApp 146; mobile above the bar at 84, 146, 208.
- The assistant (`assets/assistant.js`) loads on first click. In built-in mode nothing is sent anywhere. In AI mode the proxy is `ai-proxy/worker.js`, which uses the `@anthropic-ai/sdk` package with `claude-haiku-5-5` at effort low and max_tokens 1024. It keeps only text blocks, handles `refusal`, allows only the listed CORS origins, and rate-limits through the Cloudflare `RATE_LIMITER` binding (in-memory fallback). It was tested locally against a mock Messages API; it was not deployed.
- Every photo sent is re-encoded to JPEG (1600 px max), which strips EXIF/GPS. A file the browser cannot decode (e.g. HEIC outside Safari) is rejected with a French message asking for JPEG or PNG.
- The speedometer HUD shows only at ≥ 1600 px, where the left margin is wider than the HUD, so it never overlaps content.
- On zone and service pages the JSON-LD reuses `@id …/#garage` with the identical full entity copied from index.html (4 departments). The city is expressed through the page's own `WebPage` block (`about` the garage, plus `spatialCoverage` on zone pages).
- The AI proxy returns 502 on `refusal` or `max_tokens`, so the widget shows the built-in reply with its call-to-action buttons. The system prompt is a plain string, with no `cache_control`, because it is below the minimum cacheable length.
- The service worker never caches opaque responses. cdnjs is cached only with CORS (`crossorigin="anonymous"` added), capped at 8 entries. api-adresse, OSM tiles and the AI proxy are not intercepted. Bump `VERSION` in `sw.js` at each release.
- The 15 local/service pages were generated once from a scratch script (not committed). Each has 270 to 305 unique words of body content.

## Plan Change Log

## Review Triage Log

Pass 1 (quick lens + orchestrator visual check): high 0 / medium 8 / low 7 / false 0 / maybe-false 0, all routed to patch.
- medium: fixed `.hud` overlaps the mobile CTA and desktop headings (screenshots), which looks unprofessional.
- medium: assistant reads any 5-digit number as a postcode (mileage gets zone replies).
- medium: SAFETY regex `freinw*` typo (verified at assistant.js L133), so brake symptoms miss the do-not-ride advice.
- medium: "direction"/"fume" false safety triggers (scare replies).
- medium: prefix matching `cher` ⊂ "cherche" (verified L116/L166) gives price replies on unrelated questions.
- medium: "Je suis en panne" chip routes to diagnosis instead of towing.
- medium: HEIC passthrough sends unresized files with EXIF/GPS, which contradicts the privacy text.
- medium: zone pages reuse `@id #garage` (verified) with conflicting areaServed.
- low: invented "gare RER C" fact (verified L230).
- low: dialog `aria-modal` without inert/Esc at document level.
- low: dangling `aria-controls="mc-chat"` (verified index L1207).
- low: `geoPos` can attach to a different typed address.
- low: api-adresse label inserted via innerHTML unescaped.
- low: `cache_control` below the minimum cacheable length (verified worker L115), so the README caching claim is false.
- low: `max_tokens` truncation not handled (verified: only `refusal` is checked at L120).

## Verification

**Commands:**
- `grep -rlE "fonts\.(googleapis|gstatic)" --include=*.html .` -- expected: no output
- validate every `application/ld+json` block in all HTML files with `json.loads` (via `uv run --no-project python -I`) -- expected: all valid
- headless test (puppeteer-core + installed Chrome, as in the previous plan's scratch tests) covering every matrix row with mocked geolocation and permission denial -- expected: pass
- Lighthouse mobile -- expected: scores per Acceptance Criteria
