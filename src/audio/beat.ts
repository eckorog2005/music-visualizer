/**
 * Onset detection via spectral flux on the low end of the spectrum.
 *
 * Flux = sum of positive bin-to-bin increases since the last frame. A beat fires
 * when flux exceeds a rolling average by `sensitivity`, with a cooldown so a single
 * kick doesn't register several times.
 */
export class BeatDetector {
  private prev?: Float32Array;
  private history: number[] = [];
  private lastBeat = -Infinity;

  constructor(
    private windowSize = 43, // ~0.7s at 60fps
    private sensitivity = 1.6,
    private cooldownMs = 220,
    private minFlux = 40,
  ) {}

  update(freq: Uint8Array, now: number): boolean {
    const bins = Math.max(8, Math.floor(freq.length / 16)); // ~0–1.4kHz at 44.1kHz / fft 2048
    this.prev ??= new Float32Array(bins);

    let flux = 0;
    for (let i = 0; i < bins; i++) {
      const d = freq[i] - this.prev[i];
      if (d > 0) flux += d;
      this.prev[i] = freq[i];
    }

    this.history.push(flux);
    if (this.history.length > this.windowSize) this.history.shift();
    const mean = this.history.reduce((a, b) => a + b, 0) / this.history.length;

    const beat = flux > this.minFlux && flux > mean * this.sensitivity && now - this.lastBeat > this.cooldownMs;
    if (beat) this.lastBeat = now;
    return beat;
  }
}

/** Average normalized energy (0–1) across a fraction of the spectrum. */
export function band(freq: Uint8Array, from: number, to: number): number {
  const a = Math.floor(freq.length * from);
  const b = Math.max(a + 1, Math.floor(freq.length * to));
  let sum = 0;
  for (let i = a; i < b; i++) sum += freq[i];
  return sum / ((b - a) * 255);
}
