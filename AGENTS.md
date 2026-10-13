# AGENTS.md

Browser-based music visualizer: TypeScript + Vite, Web Audio API for analysis, Canvas 2D and WebGL for rendering. No framework and no runtime dependencies.

## Commands

```sh
npm install
npm run dev        # Vite dev server
npm run typecheck  # tsc --noEmit — the main correctness check
npm run build      # tsc && vite build → dist/
npm run preview    # serve the built dist/
```

There is no test runner and no linter. Verify changes with `npm run typecheck`, and check behaviour in the browser with `npm run dev`. `tsconfig.json` is `strict` with `noUnusedLocals` and `noUnusedParameters`, so unused bindings fail the build.

In the running app, `1`–`N` switch visualizer, `F` toggles fullscreen and `H` hides the UI.

## Architecture

The data flows one way: **source → `AudioEngine` → per-frame `Frame` → active `Visualizer`**.

- **`src/audio/engine.ts`**: one `AudioContext` with one `AnalyserNode`. Every input goes through it, so visualizers never know which source is playing.
  - `playUrl()` (local files as `blob:` URLs, Audius streams) connects the analyser to the speakers. It sets `crossOrigin = 'anonymous'`; without that, cross-origin audio reaches the analyser as silence.
  - `useStream()` (mic, tab capture) deliberately does **not** connect to the speakers. The mic would feed back, and a captured tab already plays its own audio.
  - Each switch calls `reset()`, which tears down the previous node, media element or stream and revokes `blob:` URLs.
- **`src/main.ts`**: wires up the UI and owns the `requestAnimationFrame` loop. Each frame it samples the analyser, runs `BeatDetector`, decays `pulse` (sets it to 1 on a beat, then multiplies by 0.9 each frame) and eases `palette` toward `target`. It then builds a `Frame` with `bass`/`mid`/`high` from `band()` over fractions of the spectrum and calls `render` on the active visualizer only.
- **`src/visualizers/types.ts`**: defines the `Frame` and `Visualizer` contracts and `logBands()`, which maps linear FFT bins onto log-spaced bands. Use `logBands()` for anything drawn per frequency so bass isn't crammed into one bar.
- **`src/audio/beat.ts`**: hand-rolled onset detection. It compares spectral flux on the low bins against a rolling mean, with a cooldown. This is deliberate; don't swap in a library.
- **`src/palette.ts`**: extracts 3 colours from album art. `RGB` components are **0–1**, not 0–255. Palettes are sorted darkest-first, so visualizers treat `palette[0]` as the background. `css()` converts a colour to an `rgba()` string for 2D canvases.
- **`src/sources/audius.ts`**: Audius client. It looks up a discovery host from `https://api.audius.co`, picks one at random and caches it. Requests must include `app_name`.

### Adding a visualizer

1. Implement `Visualizer`. The class creates and owns its own `<canvas>`, because a canvas can't switch between 2D and WebGL contexts.
2. Add an instance to the `visualizers` array in `main.ts`. The mode `<select>` and number-key shortcuts are generated from that array.

`resize()` is called only for the active visualizer: when its mode is selected and on window resize. Size the backing store as `width * dpr` (dpr is capped at 2). `Frame.palette` is the same array, mutated in place every frame, so read it during `render` rather than caching colours.

## Constraints

- **Do not add direct Spotify or Apple Music playback.** Their playback is DRM-protected (EME), so Web Audio can't read the samples, and Spotify's Audio Analysis/Features endpoints have been closed to new apps since 2024. Audio from streaming services comes in through tab capture instead (`tabStream()`). Chrome requires requesting video there; the video track is stopped straight away.
- `AudioContext.resume()` must run inside a user gesture. Every source is started from a click or change handler, and new sources should be too.
