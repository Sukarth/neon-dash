class AudioService {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isMuted: boolean = false;

  initialize() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
      this.gainNode.gain.value = 0.3; // Master volume
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.gainNode) {
      this.gainNode.gain.value = this.isMuted ? 0 : 0.3;
    }
    return this.isMuted;
  }

  playJump() {
    if (!this.ctx || !this.gainNode || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.gainNode);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDeath() {
    if (!this.ctx || !this.gainNode || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.gainNode);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playWin() {
    if (!this.ctx || !this.gainNode || this.isMuted) return;
    // Simple Arpeggio
    [440, 554, 659, 880].forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const startTime = this.ctx!.currentTime + (i * 0.1);
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.4);
      
      osc.connect(gain);
      gain.connect(this.gainNode!);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  }
}

export const audioService = new AudioService();