export type RGB = [number, number, number]; // 0–1

export const DEFAULT_PALETTE: RGB[] = [
  [0.1, 0.05, 0.35],
  [0.95, 0.2, 0.6],
  [0.2, 0.9, 1.0],
];

/**
 * Pull a 3-colour palette from album art: downsample, bucket colours, then take
 * the most common buckets that are neither near-black/white nor too similar.
 */
export async function paletteFromImage(url: string): Promise<RGB[]> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();

  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < 30 || min > 235) continue;
    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    // weight saturated pixels higher so muddy backgrounds don't dominate
    const w = 1 + (max - min) / 64;
    e.n += w; e.r += r * w; e.g += g * w; e.b += b * w;
    buckets.set(key, e);
  }

  const ranked = [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .map((e): RGB => [e.r / e.n / 255, e.g / e.n / 255, e.b / e.n / 255]);

  const picked: RGB[] = [];
  for (const c of ranked) {
    if (picked.every((p) => dist(p, c) > 0.25)) picked.push(c);
    if (picked.length === 3) break;
  }
  while (picked.length < 3) picked.push(DEFAULT_PALETTE[picked.length]);
  // darkest first so it works as a background colour
  return picked.sort((a, b) => lum(a) - lum(b));
}

const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lum = ([r, g, b]: RGB) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
export const css = ([r, g, b]: RGB, a = 1) => `rgba(${r * 255 | 0}, ${g * 255 | 0}, ${b * 255 | 0}, ${a})`;
