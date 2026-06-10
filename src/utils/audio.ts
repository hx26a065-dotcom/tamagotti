/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windOsc: OscillatorNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private isWindPlaying = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Set overall volume
  public setVolume(vol: number) {
    this.initCtx();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  // A low drum / taiko thump for tension beats
  public playHeartbeat(volumeMultiplier = 1.0) {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    // Double thump: bum-bum ... bum-bum
    const now = this.ctx.currentTime;
    
    // First thump
    this.thump(now, 55, 0.4 * volumeMultiplier);
    // Second thump (180ms later)
    this.thump(now + 0.18, 50, 0.3 * volumeMultiplier);
  }

  private thump(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.type = 'sine';
    // Frequency sweep down to mimic a deep drum drum
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + duration);

    gainNode.gain.setValueAtTime(0.01, time);
    gainNode.gain.linearRampToValueAtTime(0.8, time + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  // Start a continuous low-pass filtered wind noise
  public startWind() {
    this.initCtx();
    if (!this.ctx || !this.masterGain || this.isWindPlaying) return;

    try {
      const bufferSize = 2 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // White noise calculation
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'lowpass';
      this.windFilter.frequency.setValueAtTime(150, this.ctx.currentTime);
      this.windFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      // Start faint
      this.windGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      
      whiteNoise.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);

      // Modulate wind frequency for natural gusting
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(0.15, this.ctx.currentTime); // very slow cycle (6-7s)
      oscGain.gain.setValueAtTime(80, this.ctx.currentTime); // sweep range

      osc.connect(oscGain);
      oscGain.connect(this.windFilter.frequency);

      whiteNoise.start();
      osc.start();

      // Slowly swell wind
      this.windGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 3);

      this.windOsc = osc;
      this.isWindPlaying = true;
    } catch (e) {
      console.warn('Could not start synthesized wind:', e);
    }
  }

  public stopWind() {
    if (this.windGain && this.ctx) {
      this.windGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      setTimeout(() => {
        try {
          if (this.windOsc) this.windOsc.stop();
          this.isWindPlaying = false;
        } catch (_) {}
      }, 600);
    }
  }

  // The high-tension warning chime "SHING!" or "ZAN!" when '斬' strikes
  public playSlashSignal() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    
    // Low bell / chime
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(220, now); // A3
    gain1.gain.setValueAtTime(0.6, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    
    // High metal ring
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now); // A5
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain2.gain.setValueAtTime(0.5, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);

    // High shimmer
    const osc3 = this.ctx.createOscillator();
    const gain3 = this.ctx.createGain();
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(1760, now); // A6
    gain3.gain.setValueAtTime(0.1, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc3.connect(gain3);
    gain3.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    osc1.stop(now + 1.3);
    osc2.stop(now + 0.9);
    osc3.stop(now + 0.4);
  }

  // Fast katana quick-draw swish whoosh sound
  public playSwordSwish() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const duration = 0.22;

    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(8.0, now);
    // Sweep frequency up very fast
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2500, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);
  }

  // Clean hit impact (slice slash connecting)
  public playSlashSlice() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    this.playSwordSwish();

    const now = this.ctx.currentTime + 0.05;
    
    // Heavy crimson meat slicing splat sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.35);

    // Crackle spark
    const clickNode = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickNode.type = 'triangle';
    clickNode.frequency.setValueAtTime(3000, now);
    clickGain.gain.setValueAtTime(0.2, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    clickNode.connect(clickGain);
    clickGain.connect(this.masterGain);

    clickNode.start(now);
    clickNode.stop(now + 0.06);
  }

  // Steel sword steel clash parry sound (for draw-offs or dramatic blocks)
  public playSwordClash() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    // High metal clash chime
    const metal1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    metal1.type = 'sine';
    metal1.frequency.setValueAtTime(1250, now);
    metal1.frequency.linearRampToValueAtTime(800, now + 0.15);
    gain1.gain.setValueAtTime(0.7, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    const metal2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    metal2.type = 'sine';
    metal2.frequency.setValueAtTime(2130, now);
    metal2.frequency.linearRampToValueAtTime(1700, now + 0.1);
    gain2.gain.setValueAtTime(0.5, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    const metal3 = this.ctx.createOscillator();
    const gain3 = this.ctx.createGain();
    metal3.type = 'triangle';
    metal3.frequency.setValueAtTime(3180, now);
    gain3.gain.setValueAtTime(0.3, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    metal1.connect(gain1);
    metal2.connect(gain2);
    metal3.connect(gain3);

    gain1.connect(this.masterGain);
    gain2.connect(this.masterGain);
    gain3.connect(this.masterGain);

    metal1.start(now);
    metal2.start(now);
    metal3.start(now);

    metal1.stop(now + 0.7);
    metal2.stop(now + 0.5);
    metal3.stop(now + 0.25);
  }

  // Early-trigger buzzer error sound (お手つき!)
  public playFalseStartBuzz() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    
    // Deep dual dissonant saw buzzes
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, now); // A2
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(114, now); // slightly detuned

    gainNode.gain.setValueAtTime(0.8, now);
    gainNode.gain.linearRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  }

  // Traditional Japanese instruments (Shamisen/Koto style melody segment) for start or win screens
  public playVictoryMelody() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Classic Japanese pentatonic scale (Yo / In scale): A4, B4, C5, E5, F5, A5
    const notes = [440, 493.88, 523.25, 659.25, 698.46, 880];
    
    // Play a gorgeous quick harp pluck sequence
    // Note index paths
    const seq = [0, 2, 3, 5, 4, 3, 2, 0];
    const itemDurations = [0.15, 0.15, 0.15, 0.3, 0.15, 0.15, 0.15, 0.5];

    let accumTime = now;
    for (let i = 0; i < seq.length; i++) {
      const f = notes[seq[i]];
      const d = itemDurations[i];
      this.playShamisenPluck(accumTime, f, d);
      accumTime += d - 0.02; // slight overlapping legato feel
    }
  }

  // Traditional Japanese shakuhachi wind sound / koto intro melody
  public playIntroMelody() {
    this.initCtx();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const notes = [220, 246.94, 261.63, 329.63, 349.23, 440]; // octave lower pentatonic
    const seq = [0, 3, 4, 5];
    const delays = [0, 0.4, 0.8, 1.2];

    for (let i = 0; i < seq.length; i++) {
      const f = notes[seq[i]];
      this.playShakuhachiBlow(now + delays[i], f, 0.8);
    }
  }

  private playShamisenPluck(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    // Shamisen has a highly characteristic biting distortion / high harmonic pluck (sawtooth mixed with sine)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    // Sharp lowpass decay down
    lowpass.frequency.setValueAtTime(3000, time);
    lowpass.frequency.exponentialRampToValueAtTime(300, time + duration);

    gainNode.gain.setValueAtTime(0.01, time);
    gainNode.gain.linearRampToValueAtTime(0.7, time + 0.005); // immediate snap attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(lowpass);
    lowpass.connect(gainNode);
    gainNode.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  private playShakuhachiBlow(time: number, freq: number, duration: number) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    // Shakuhachi flute wind woodwind tone
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    // Soft pitch vibrato (tremolo/vibrato)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(6.0, time);
    lfoGain.gain.setValueAtTime(4.0, time);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(freq, time);
    bandpass.Q.setValueAtTime(3.0, time);

    gainNode.gain.setValueAtTime(0.01, time);
    // Soft attack
    gainNode.gain.linearRampToValueAtTime(0.25, time + 0.2); 
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

    lfo.connect(lfoGain);
    osc.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(this.masterGain);

    lfo.start(time);
    osc.start(time);

    lfo.stop(time + duration);
    osc.stop(time + duration);
  }
}

export const Synth = new AudioSynthesizer();
export default Synth;
