/**
 * Owns the AudioContext and a single AnalyserNode. Every input (file, stream URL,
 * mic, captured tab) is routed through the analyser so visualizers never care
 * where the sound came from.
 */
export class AudioEngine {
  readonly ctx = new AudioContext();
  readonly analyser: AnalyserNode;
  readonly freq: Uint8Array<ArrayBuffer>;
  readonly wave: Uint8Array<ArrayBuffer>;

  private node?: AudioNode;
  private media?: HTMLAudioElement;
  private stream?: MediaStream;

  constructor(fftSize = 2048) {
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = 0.8;
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.wave = new Uint8Array(this.analyser.fftSize);
  }

  /** Play a URL (blob: or CORS-enabled http) through the speakers and the analyser. */
  async playUrl(url: string): Promise<HTMLAudioElement> {
    await this.reset();
    const el = new Audio();
    el.crossOrigin = 'anonymous'; // without this, cross-origin audio is silenced in the analyser
    el.src = url;
    this.media = el;
    this.node = this.ctx.createMediaElementSource(el);
    this.node.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    await el.play();
    return el;
  }

  /** Analyse a live stream. Not routed to the speakers (mic would feed back; tabs already play themselves). */
  async useStream(stream: MediaStream): Promise<void> {
    await this.reset();
    this.stream = stream;
    this.node = this.ctx.createMediaStreamSource(stream);
    this.node.connect(this.analyser);
  }

  sample(): void {
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.wave);
  }

  private async reset(): Promise<void> {
    await this.ctx.resume(); // must happen inside a user gesture at least once
    this.node?.disconnect();
    this.analyser.disconnect();
    if (this.media) {
      this.media.pause();
      if (this.media.src.startsWith('blob:')) URL.revokeObjectURL(this.media.src);
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.node = this.media = this.stream = undefined;
  }
}
