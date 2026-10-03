import './style.css';
import { AudioEngine } from './audio/engine';
import { BeatDetector, band } from './audio/beat';
import { micStream, tabStream } from './audio/sources';
import { searchTracks, type Track } from './sources/audius';
import { DEFAULT_PALETTE, paletteFromImage, type RGB } from './palette';
import { Bars } from './visualizers/bars';
import { Radial } from './visualizers/radial';
import { Shader } from './visualizers/shader';
import type { Visualizer } from './visualizers/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const engine = new AudioEngine();
const beats = new BeatDetector();
const visualizers: Visualizer[] = [new Shader(), new Radial(), new Bars()];
let active = 0;

// palette eases toward the target so track changes cross-fade instead of snapping
let palette: RGB[] = DEFAULT_PALETTE.map((c) => [...c] as RGB);
let target: RGB[] = DEFAULT_PALETTE;
let pulse = 0;

const stage = $<HTMLDivElement>('stage');
const modeSelect = $<HTMLSelectElement>('mode');

visualizers.forEach((v, i) => modeSelect.add(new Option(`${i + 1}. ${v.name}`, String(i))));

function setMode(i: number) {
  active = (i + visualizers.length) % visualizers.length;
  stage.replaceChildren(visualizers[active].canvas);
  modeSelect.value = String(active);
  resize();
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio, 2);
  visualizers[active].resize(window.innerWidth, window.innerHeight, dpr);
}

function setNowPlaying(title: string, artUrl?: string) {
  $('title').textContent = title;
  const art = $<HTMLImageElement>('art');
  art.hidden = !artUrl;
  if (artUrl) art.src = artUrl;
  target = DEFAULT_PALETTE;
  if (artUrl) paletteFromImage(artUrl).then((p) => (target = p)).catch(() => {});
}

async function run(label: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error(err);
    setNowPlaying(`${label} failed: ${err instanceof Error ? err.message : err}`);
  }
}

// --- sources ---------------------------------------------------------------

$<HTMLInputElement>('file').addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  run('File', async () => {
    await engine.playUrl(URL.createObjectURL(file));
    setNowPlaying(file.name.replace(/\.[^.]+$/, ''));
  });
});

$('mic').addEventListener('click', () =>
  run('Mic', async () => {
    await engine.useStream(await micStream());
    setNowPlaying('Microphone');
  }),
);

$('tab').addEventListener('click', () =>
  run('Tab capture', async () => {
    await engine.useStream(await tabStream());
    setNowPlaying('Captured tab audio');
  }),
);

const results = $<HTMLUListElement>('results');

$<HTMLFormElement>('search').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $<HTMLInputElement>('q').value.trim();
  if (!q) return;
  run('Search', async () => {
    const tracks = await searchTracks(q);
    results.replaceChildren(...tracks.map(trackItem));
    if (tracks.length === 0) results.textContent = 'No results';
  });
});

function trackItem(t: Track): HTMLLIElement {
  const li = document.createElement('li');
  li.innerHTML = `<img alt="" /><span><b></b><small></small></span>`;
  if (t.artworkUrl) li.querySelector('img')!.src = t.artworkUrl;
  li.querySelector('b')!.textContent = t.title;
  li.querySelector('small')!.textContent = t.artist;
  li.addEventListener('click', () =>
    run('Playback', async () => {
      results.replaceChildren();
      await engine.playUrl(t.streamUrl);
      setNowPlaying(`${t.title} — ${t.artist}`, t.artworkUrl);
    }),
  );
  return li;
}

// --- controls --------------------------------------------------------------

modeSelect.addEventListener('change', () => setMode(Number(modeSelect.value)));
window.addEventListener('resize', resize);
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key >= '1' && e.key <= String(visualizers.length)) setMode(Number(e.key) - 1);
  else if (e.key === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  else if (e.key === 'h') document.body.classList.toggle('hide-ui');
});

// --- render loop -----------------------------------------------------------

function frame(ms: number) {
  engine.sample();
  const { freq, wave } = engine;
  if (beats.update(freq, ms)) pulse = 1;
  pulse *= 0.9;

  for (let i = 0; i < 3; i++)
    for (let c = 0; c < 3; c++) palette[i][c] += (target[i][c] - palette[i][c]) * 0.03;

  visualizers[active].render({
    freq,
    wave,
    time: ms / 1000,
    bass: band(freq, 0, 0.03),
    mid: band(freq, 0.03, 0.2),
    high: band(freq, 0.2, 0.6),
    pulse,
    palette,
  });
  requestAnimationFrame(frame);
}

setMode(0);
requestAnimationFrame(frame);
