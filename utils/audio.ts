export class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx!.createGain();
      this.masterGain.connect(this.ctx!.destination);
    } catch (e) {
      console.warn('AudioContext not supported', e);
    }
  }

  setVolume(volume: number) {
    if (this.masterGain) {
      // Clamp volume 0-1
      const v = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.setTargetAtTime(v, this.ctx?.currentTime || 0, 0.1);
    }
  }

  playJump() {
    this.playTone(150, 'sine', 0.15, 300, 0.3);
  }

  playCollect() {
    this.playTone(880, 'sine', 0.1, 1760, 0.2);
  }

  playDamage() {
    this.playTone(150, 'sawtooth', 0.3, 50, 0.4);
  }

  playEnemyDeath() {
    this.playTone(200, 'square', 0.15, 50, 0.2);
  }
  
  playShoot() {
    this.playTone(400, 'triangle', 0.1, 100, 0.2);
  }

  playStep() {
    // Very subtle noise for stepping? Maybe skip for now to avoid noise
  }

  private playTone(freq: number, type: OscillatorType, duration: number, endFreq?: number, vol: number = 0.5) {
    if (!this.ctx || !this.masterGain) this.init();
    if (!this.ctx || !this.masterGain) return;
    
    // Resume context if suspended (common in browsers)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    }
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
}

export const audioManager = new AudioController();
