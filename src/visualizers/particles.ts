import { css } from '../palette';
import type { Frame, Visualizer } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const MAX = 600;

export class Particles implements Visualizer {
  readonly name = 'Particles';
  readonly canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private particles: Particle[] = [];

  resize(w: number, h: number, dpr: number) {
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
  }

  render(f: Frame) {
    const { ctx, canvas, particles } = this;
    const { width: W, height: H } = canvas;
    const [bg, c1, c2] = f.palette;
    const unit = Math.min(W, H);

    ctx.fillStyle = css(bg, 0.3);
    ctx.fillRect(0, 0, W, H);

    const burst = Math.round(f.pulse > 0.95 ? 40 : f.high * 6);
    for (let i = 0; i < burst && particles.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = unit * (0.003 + f.bass * 0.012) * (0.5 + Math.random());
      particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1 });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.01;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = css(i % 2 ? c1 : c2, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, unit * 0.004 * (1 + f.mid * 2) * p.life + 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
