import type { RGB } from '../palette';

export interface Frame {
  freq: Uint8Array;
  wave: Uint8Array;
  time: number; // seconds
  dt: number; // seconds since the previous frame, capped at 0.1
  bass: number; // 0–1
  mid: number;
  high: number;
  pulse: number; // 1 on a beat, decays toward 0
  palette: RGB[];
}

/** Fraction to apply this frame so that `rate` per 60Hz frame holds at any refresh rate. */
export const perFrame = (rate: number, dt: number) => 1 - Math.pow(1 - rate, dt * 60);

/** Each visualizer owns its canvas, since a canvas can hold only one context type (2D or WebGL). */
export interface Visualizer {
  readonly name: string;
  readonly canvas: HTMLCanvasElement;
  resize(width: number, height: number, dpr: number): void;
  render(frame: Frame): void;
  destroy?(): void;
}

/** Map linear FFT bins onto `count` log-spaced bands — matches how we hear pitch. */
export function logBands(freq: Uint8Array, count: number, out = new Float32Array(count)): Float32Array {
  const min = 1;
  const max = freq.length * 0.75; // top quarter is mostly empty in real music
  for (let i = 0; i < count; i++) {
    const a = Math.floor(min * Math.pow(max / min, i / count));
    const b = Math.max(a + 1, Math.floor(min * Math.pow(max / min, (i + 1) / count)));
    let peak = 0;
    for (let j = a; j < b; j++) peak = Math.max(peak, freq[j]);
    out[i] = peak / 255;
  }
  return out;
}
