# modern-noise: agent directives

You are contributing to **Modern Noise**, a zero-dependency web app that synthesizes procedural and sampled background noise in a skeuomorphic hardware faceplate UI.

**CRITICAL:** Always run `npm run check` and ensure it passes with zero errors or warnings before finishing a task or updating a pull request. It executes:

1. `npm run format:check` (`prettier --check .`)
2. `npm run lint` (`eslint . --max-warnings=0`, including JSON and CSS)
3. `npm run lint:sonar` (`eslint-plugin-sonarjs`, enforcing cognitive complexity and code-smell rules)
4. `npm run lint:security` (`eslint-plugin-security` and `eslint-plugin-no-unsanitized`)
5. `npm run test` (`vitest run` in JSDOM)

## Architecture

- **Runtime & Hosting:** Static vanilla HTML/CSS/ES modules served directly from `public/` (`npm run dev` runs `serve public`) with no bundler or build step, deployed to Firebase Hosting (`firebase.json`).
- **Strict CSP:** `firebase.json` enforces `default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self'`. Never use inline scripts, inline styles, or unauthorized external assets (including in `public/404.html`).
- **Audio Pipeline:** Web Audio API graph (`sources -> masterGain -> DynamicsCompressorNode -> destination`) paired with a looping near-silent `<audio src="/audio/background.mp3">` keepalive and `navigator.mediaSession` metadata/action handlers so background audio and OS media controls work reliably on mobile and desktop.

## Layout

- `public/index.html`, `public/404.html`, `public/style.css`, `public/manifest.json` — markup, tactile hardware faceplate grid styling, and PWA manifest.
- `public/bring-the-noise.js` — browser entry module; auto-calls `initApp()` when `#buttons` is present in `document` and re-exports public symbols for tests.
- `public/js/audio-assets.js` — `NOISE_MODES` `Map`, `NOISE_TYPES`, and `.aac` Freesound URL catalogs (`screamingUrls`, `trafficUrls`, `buildingUrls`, `spookyAmbienceUrls`, `spookyUrls`).
- `public/js/dsp.js` — procedural `whiteNoiseBuffer`, `pinkNoiseBuffer`, and `brownNoiseBuffer` generators with filter warmup and equal-power loop-boundary crossfade.
- `public/js/noise-engine.js` — `NoiseEngine` class managing the Web Audio graph (`22050 Hz` `AudioContext`), bounded LRU `sampleBufferCache` (`MAX_CACHED_SAMPLE_BUFFERS = 24`), progressive sample decoding (`DECODE_CONCURRENCY = 4`, Fisher-Yates shuffle, `AbortController`, generation token), per-mode `interval`, continuous `backgroundUrls` streams, on-demand periodic `extraStreams` (`startPeriodicClipStream()`), `isAudioContextRunning()` suspension guards, and `AudioParam` gain automation.
- `public/js/ui.js` — DOM event wiring, `?sound=` URL query parameter sync (`window.history.replaceState`, defaulting to `white`), `vertical-lr` `rtl` `#volume-slider` (`0%`–`200%`), `aria-pressed` / `aria-hidden` LCD status display, and `navigator.mediaSession` integration.
- `public/audio/<category>/` — normalized `.aac` sample clips (`screams`, `traffic`, `construction`, `spooky`) plus `background.mp3`.
- `public/img/` — `1024x1024` mode artwork JPEGs (`/img/<mode>.jpg`), social preview card (`/img/modern-noise-preview.jpg`), PWA icons (`192`/`512`/`1024`), and `lcd-text-background.svg`.
- `tests/` — Vitest + JSDOM test suites (`assets.test.js`, `bring-the-noise.test.js`, `noise-engine.test.js`, `setup.js`).

## Conventions & Gotchas

1. **Audio clips, credits & asset parity (`tests/assets.test.js`):**
   - All sampled clips under `public/audio/<category>/` must be CC0 or CC-BY licensed from Freesound, credited by URL under `## Sounds` in `README.md`, and named `<id>__<username>__<slug>.aac`.
   - Normalize all `.aac` clips to `AAC LC`, `22050 Hz`, mono (`-ac 1`), `64 kbps` (`-b:a 64k`) at consistent loudness (~`-17 dB` mean volume).
   - `tests/assets.test.js` enforces 1:1 parity between `public/audio/*/*.aac` files on disk, the URL arrays in `public/js/audio-assets.js` (update the total count assertion when adding/removing clips), and Freesound `/sounds/<id>/` credits in `README.md`, as well as mode artwork and `manifest.json` icons.
2. **Web Audio invariants:**
   - Sampled modes intentionally allow overlapping concurrent clips behind `DynamicsCompressorNode` (`threshold: -6 dB`, `ratio: 12:1`); do not cap concurrent `AudioBufferSourceNode` voices.
   - Modes in `NOISE_MODES` support three sampled stream types: primary `urls` (`interval`, plus `waitForClip: true` when `backgroundUrls` is present so clips wait `Math.min(duration, 8)` + `interval`), continuous chaining `backgroundUrls` (`background: true`), and sparse on-demand `extraStreams` (`startPeriodicClipStream()`, which fetches/decodes a single random clip per timer tick without pre-decoding the pool).
   - Always call `cancelScheduledValues(now)` and anchor with `setValueAtTime(...)` before scheduling `linearRampToValueAtTime` or `setTargetAtTime` on `masterGain.gain`.
   - Guard all async fetch/decode work and timers with both `AbortController` (`signal.aborted`) and `this.generation === gen` so rapid mode toggles or pausing never leak timers or audio nodes.
3. **UI, fonts & CSS hardware faceplate rules:**
   - `public/index.html` loads Google Fonts `Noto Emoji` with a `?text=` glyph subset parameter. `tests/assets.test.js` verifies that `?text=` contains the exact sorted set of unique emoji characters in `document.body`—update that `<link>` whenever adding or changing button or LCD emojis.
   - `#lcd-screen` (`repeat(2, var(--unit))` rows + auto columns) defines the width of `main`. `#buttons` is a 4-column grid (`repeat(4, var(--butt-size))`) with `justify-content: center` and `#volume-slider` at `grid-area: 1 / 1 / 3 / 1` (do not set `justify-self: center` on `#volume-slider`, so it spans the full width of column 1).
   - `.noise-button` uses momentary push-button `:active` styling; `aria-pressed="true"` is for assistive technology state only and must not visually latch or depress buttons.
   - Do not disable `.lcd-on` marquee scrolling or `.lcd-icon-pulsing` behind `@media (prefers-reduced-motion: reduce)`—both are core LCD playback indicators and remote desktop environments commonly report `prefers-reduced-motion: reduce` by default.
4. **Dependencies & lockfile hygiene:**
   - Keep zero runtime dependencies. If updating `devDependencies`, commit both `package.json` and `package-lock.json` and verify every `"resolved"` URL in `package-lock.json` starts with `https://registry.npmjs.org/`.
