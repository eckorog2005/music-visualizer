import type { Frame, Visualizer } from './types';

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

// Milkdrop-flavoured tunnel: spectrum texture drives a ring, bands drive speed/colour.
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime, uBass, uMid, uHigh, uPulse;
uniform vec3 uC0, uC1, uC2;
uniform sampler2D uSpec;

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float spec = texture2D(uSpec, vec2(abs(a) / 3.14159, 0.5)).r;

  float depth = 0.3 / (r + 0.05) + uTime;
  float w = sin(depth * 4.0 + a * 3.0 + sin(uTime * 0.7) * 2.0) * 0.5 + 0.5;

  vec3 col = mix(uC0, uC1, w);
  col = mix(col, uC2, uHigh * (1.0 - w));
  col *= 0.35 + uMid * 1.2 + uPulse * 0.5;

  float ring = smoothstep(0.025, 0.0, abs(r - (0.22 + spec * 0.3 + uPulse * 0.03)));
  col += ring * uC2 * (0.6 + spec);
  col *= smoothstep(1.5, 0.15, r);
  gl_FragColor = vec4(col, 1.0);
}
`;

const SPEC_SIZE = 256;

export class Shader implements Visualizer {
  readonly name = 'Shader tunnel';
  readonly canvas = document.createElement('canvas');
  private gl = this.canvas.getContext('webgl')!;
  private program: WebGLProgram;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private spec = new Uint8Array(SPEC_SIZE);
  private travel = 0;
  private last = 0;

  constructor() {
    const gl = this.gl;
    this.program = link(gl, VERT, FRAG);
    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // one oversized triangle
    const loc = gl.getAttribLocation(this.program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    for (const name of ['uRes', 'uTime', 'uBass', 'uMid', 'uHigh', 'uPulse', 'uC0', 'uC1', 'uC2', 'uSpec']) {
      this.u[name] = gl.getUniformLocation(this.program, name);
    }
  }

  resize(w: number, h: number, dpr: number) {
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(f: Frame) {
    const { gl, u } = this;
    // integrate speed so bass accelerates the tunnel without making it jump
    const dt = this.last ? Math.min(0.1, f.time - this.last) : 0;
    this.last = f.time;
    this.travel += dt * (0.3 + f.bass * 1.5);

    const step = (f.freq.length * 0.5) / SPEC_SIZE; // lower half holds the interesting content
    for (let i = 0; i < SPEC_SIZE; i++) this.spec[i] = f.freq[Math.floor(i * step)];
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, SPEC_SIZE, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.spec);

    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, this.travel);
    gl.uniform1f(u.uBass, f.bass);
    gl.uniform1f(u.uMid, f.mid);
    gl.uniform1f(u.uHigh, f.high);
    gl.uniform1f(u.uPulse, f.pulse);
    gl.uniform3fv(u.uC0, f.palette[0]);
    gl.uniform3fv(u.uC1, f.palette[1]);
    gl.uniform3fv(u.uC2, f.palette[2]);
    gl.uniform1i(u.uSpec, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader compile failed');
  return s;
}

function link(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'program link failed');
  return p;
}
