# Music Visualizer

Real-time, browser-based music visualizer built with TypeScript, the Web Audio API and WebGL.

## Audio sources
| Source | How |
|---|---|
| **Audius** | Search and stream full tracks; album art recolours the visuals |
| **Local file** | Any audio file the browser can decode |
| **Microphone** | Whatever's playing in the room |
| **Tab capture** | Play Spotify / YouTube in another tab, click *Capture tab*, tick **Share tab audio** (Chrome) |

## Run
```sh
npm install
npm run dev
```

Keys: `1`–`3` switch modes · `F` fullscreen · `H` hide UI

## Design decisions
- **Why not stream from Spotify directly?** Spotify playback is DRM-protected (EME), so the browser won't expose
  its samples to Web Audio, and the Audio Analysis/Features endpoints were deprecated for new apps in 2024.
  Analysis therefore happens on audio we *can* read; streaming services are reached via tab capture.
- **Beat detection** uses spectral flux on low frequencies against a rolling mean, with a cooldown
  (`src/audio/beat.ts`), not a library.
- **Log-spaced bands** so bass isn't squashed into one bar (`logBands` in `src/visualizers/types.ts`).
- **Palette from album art**: bucketed colour quantization, weighted toward saturated pixels, eased between tracks.
- **One canvas per visualizer**, since a canvas can't switch between 2D and WebGL contexts.

## Structure
```
src/
  audio/        engine (AnalyserNode routing), beat detection, mic/tab capture
  sources/      Audius API client
  visualizers/  bars (2D), radial (2D), shader tunnel (WebGL)
  palette.ts    album-art colour extraction
  main.ts       UI wiring + render loop
```
