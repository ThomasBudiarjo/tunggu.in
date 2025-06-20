import { useSettingsStore } from "../stores/settingsStore";

export type SoundType =
  | "timer-start"
  | "timer-complete"
  | "interval-change"
  | "kitchen-timer"
  | "fitness-timer"
  | "alert-warning";

class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<SoundType, AudioBuffer> = new Map();
  private gainNode: GainNode | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize on first user interaction
    if (typeof window !== "undefined") {
      ["click", "touchstart"].forEach((event) => {
        window.addEventListener(event, () => this.initialize(), { once: true });
      });
    }
  }

  private async initialize() {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      // Set initial volume
      const settings = useSettingsStore.getState();
      this.setVolume(settings.volume);

      // Create synthetic sounds using Web Audio API
      await this.createSounds();

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
    }
  }

  private async createSounds() {
    if (!this.audioContext) return;

    // Timer start - soft click
    this.sounds.set("timer-start", await this.createClickSound(0.1, 800));

    // Timer complete - gentle chime
    this.sounds.set("timer-complete", await this.createChimeSound());

    // Interval change - beep
    this.sounds.set(
      "interval-change",
      await this.createBeepSound(0.15, 600, 0.1)
    );

    // Kitchen timer - ding
    this.sounds.set("kitchen-timer", await this.createDingSound());

    // Fitness timer - energetic beep
    this.sounds.set(
      "fitness-timer",
      await this.createBeepSound(0.2, 800, 0.15)
    );

    // Alert/warning - urgent beep
    this.sounds.set("alert-warning", await this.createUrgentBeepSound());
  }

  private createClickSound(duration: number, frequency: number): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const length = duration * sampleRate;
    const buffer = this.audioContext!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30);
      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }

    return buffer;
  }

  private createBeepSound(
    duration: number,
    frequency: number,
    fadeOut: number
  ): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const length = duration * sampleRate;
    const buffer = this.audioContext!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let envelope = 1;

      // Fade in
      if (t < 0.01) {
        envelope = t / 0.01;
      }
      // Fade out
      else if (t > duration - fadeOut) {
        envelope = (duration - t) / fadeOut;
      }

      data[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.4;
    }

    return buffer;
  }

  private createChimeSound(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const duration = 1.5;
    const length = duration * sampleRate;
    const buffer = this.audioContext!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      frequencies.forEach((freq, index) => {
        const delay = index * 0.1;
        if (t > delay) {
          const localT = t - delay;
          const envelope = Math.exp(-localT * 2) * 0.3;
          sample += Math.sin(2 * Math.PI * freq * localT) * envelope;
        }
      });

      data[i] = sample;
    }

    return buffer;
  }

  private createDingSound(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const duration = 0.8;
    const length = duration * sampleRate;
    const buffer = this.audioContext!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    const baseFreq = 880; // A5
    const harmonics = [1, 2, 3, 4];

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      harmonics.forEach((harmonic, index) => {
        const freq = baseFreq * harmonic;
        const amplitude = 0.3 / (index + 1);
        const envelope = Math.exp(-t * (2 + index));
        sample += Math.sin(2 * Math.PI * freq * t) * envelope * amplitude;
      });

      data[i] = sample;
    }

    return buffer;
  }

  private createUrgentBeepSound(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate;
    const duration = 0.5;
    const length = duration * sampleRate;
    const buffer = this.audioContext!.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const beepOn = Math.floor(t * 8) % 2 === 0;

      if (beepOn) {
        const freq = 1000 + Math.sin(t * 20) * 200;
        data[i] = Math.sin(2 * Math.PI * freq * t) * 0.5;
      } else {
        data[i] = 0;
      }
    }

    return buffer;
  }

  async play(soundType: SoundType) {
    const settings = useSettingsStore.getState();
    if (!settings.soundEnabled) return;

    await this.initialize();

    if (!this.audioContext || !this.gainNode) return;

    const buffer = this.sounds.get(soundType);
    if (!buffer) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);
      source.start();
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  }

  setVolume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  setMuted(muted: boolean) {
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : useSettingsStore.getState().volume;
    }
  }
}

export const soundManager = new SoundManager();
