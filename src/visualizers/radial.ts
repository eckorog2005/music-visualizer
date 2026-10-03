import { css } from '../palette';
import { logBands, type Frame, type Visualizer } from './types';

export class Radial implements Visualizer {
  readonly name = 'Radial';
  readonly canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private bands = new Float32Array(96);
  private rotation = 0;

  resize(w: number, h: number, dpr: number) {
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
  }

  render(f: Frame) {
    const { ctx, canvas } = this;
    const { width: W, height: H } = canvas;
    const [bg, c1, c2] = f.palette;
    const cx = W / 2;
    const cy = H / 2;
    const base = Math.min(W, H) * (0.18 + f.bass * 0.06 + f.pulse * 0.03);

    ctx.fillStyle = css(bg, 0.25);
    ctx.fillRect(0, 0, W, H);

    this.rotation += 0.002 + f.mid * 0.01;
    logBands(f.freq, this.bands.length, this.bands);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, (Math.PI * 2 * base) / this.bands.length / 2);
    // draw the spectrum mirrored so the ring is symmetric
    const n = this.bands.length;
    for (let i = 0; i < n * 2; i++) {
      const v = this.bands[i < n ? i : n * 2 - 1 - i];
      const a = (i / (n * 2)) * Math.PI * 2;
      const len = v * Math.min(W, H) * 0.28;
      ctx.strokeStyle = css(i % 2 ? c1 : c2, 0.6 + v * 0.4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * base, Math.sin(a) * base);
      ctx.lineTo(Math.cos(a) * (base + len), Math.sin(a) * (base + len));
      ctx.stroke();
    }
    ctx.restore();

    // waveform ring inside
    ctx.strokeStyle = css(c2, 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = 4;
    for (let i = 0; i <= f.wave.length; i += step) {
      const s = (f.wave[i % f.wave.length] - 128) / 128;
      const a = (i / f.wave.length) * Math.PI * 2;
      const r = base * 0.8 + s * base * 0.35;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
}
