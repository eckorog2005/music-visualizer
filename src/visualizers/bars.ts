import { css } from '../palette';
import { logBands, perFrame, type Frame, type Visualizer } from './types';

export class Bars implements Visualizer {
  readonly name = 'Spectrum bars';
  readonly canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private bands = new Float32Array(64);
  private peaks = new Float32Array(64);

  resize(w: number, h: number, dpr: number) {
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
  }

  render(f: Frame) {
    const { ctx, canvas } = this;
    const { width: W, height: H } = canvas;
    const [bg, c1, c2] = f.palette;

    // translucent fill leaves motion trails
    ctx.fillStyle = css(bg, perFrame(0.35, f.dt));
    ctx.fillRect(0, 0, W, H);

    logBands(f.freq, this.bands.length, this.bands);
    const gap = W * 0.004;
    const bw = W / this.bands.length - gap;
    const grad = ctx.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, css(c1));
    grad.addColorStop(1, css(c2));

    for (let i = 0; i < this.bands.length; i++) {
      const v = this.bands[i];
      this.peaks[i] = Math.max(v, this.peaks[i] - 0.008);
      const x = i * (bw + gap) + gap / 2;
      const h = v * H * (0.85 + f.pulse * 0.1);
      ctx.fillStyle = grad;
      ctx.fillRect(x, H - h, bw, h);
      ctx.fillStyle = css(c2, 0.9);
      ctx.fillRect(x, H - this.peaks[i] * H - 4, bw, 3);
    }
  }
}
