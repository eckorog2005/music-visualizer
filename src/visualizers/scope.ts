import { css } from '../palette';
import { perFrame, type Frame, Visualizer } from './types';

export class Scope implements Visualizer {
  readonly name = 'Scope';
  readonly canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;

  resize(w: number, h: number, dpr: number) {
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
  }

  render(f: Frame) {
    const { ctx, canvas } = this;
    const { width: W, height: H } = canvas;
    const [bg, c1, c2] = f.palette;

    ctx.fillStyle = css(bg, perFrame(0.2, f.dt));
    ctx.fillRect(0, 0, W, H);

    const layers = [
      { color: c1, scale: 0.35 + f.bass * 0.3, width: 3 },
      { color: c2, scale: 0.2 + f.mid * 0.2, width: 2 },
    ];
    for (const { color, scale, width } of layers) {
      ctx.strokeStyle = css(color, 0.8);
      ctx.lineWidth = width + f.pulse * 3;
      ctx.beginPath();
      for (let i = 0; i < f.wave.length; i++) {
        const x = (i / (f.wave.length - 1)) * W;
        const y = H / 2 + ((f.wave[i] - 128) / 128) * H * scale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}
