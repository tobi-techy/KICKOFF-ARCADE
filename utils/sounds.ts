// Enhanced sound system with Web Audio API
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getContext(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "square",
    volume = 0.3,
    attack = 0.01,
    decay = 0.1
  ) {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    // ADSR envelope
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    gain.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + attack + decay);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private playNoise(duration: number, volume = 0.2) {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;

    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 800;

    source.buffer = buffer;
    gain.gain.value = volume;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  kick = () => {
    // Punchy kick sound
    this.playTone(120, 0.15, "triangle", 0.5, 0.005, 0.05);
    this.playNoise(0.08, 0.15);
  };

  pass = () => {
    // Softer pass sound
    this.playTone(180, 0.1, "sine", 0.35, 0.01, 0.03);
  };

  goal = () => {
    // Triumphant goal fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, "square", 0.25, 0.01, 0.05);
      }, i * 120);
    });
  };

  whistle = () => {
    // Referee whistle
    this.playTone(1200, 0.15, "sine", 0.3, 0.01, 0.02);
    setTimeout(() => this.playTone(1400, 0.1, "sine", 0.25), 180);
    setTimeout(() => this.playTone(1200, 0.3, "sine", 0.3), 300);
  };

  bounce = () => {
    // Ball hitting wall/post
    this.playTone(300, 0.08, "triangle", 0.25, 0.005, 0.02);
  };

  sprint = () => {
    this.playTone(80, 0.03, "triangle", 0.08);
  };

  toggle = () => {
    this.enabled = !this.enabled;
    return this.enabled;
  };
}

export const sounds = new SoundEngine();
