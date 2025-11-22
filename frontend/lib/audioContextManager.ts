// audioContextManager.ts - derived from beatsync implementation
class AudioContextManager {
  private static instance: AudioContextManager | null = null;
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private stateChangeCallback: ((state: AudioContextState) => void) | null = null;
  private constructor() {}
  static getInstance(): AudioContextManager {
    if (!AudioContextManager.instance) {
      AudioContextManager.instance = new AudioContextManager();
    }
    return AudioContextManager.instance;
  }
  getContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
      this.setupStateChangeListener();
      this.setupMasterGain();
    }
    return this.audioContext;
  }
  getMasterGain(): GainNode {
    if (!this.masterGainNode) {
      const ctx = this.getContext();
      this.masterGainNode = ctx.createGain();
      this.masterGainNode.connect(ctx.destination);
      this.masterGainNode.gain.value = 1.0;
    }
    return this.masterGainNode;
  }
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }
  setStateChangeCallback(cb: (state: AudioContextState) => void) { this.stateChangeCallback = cb }
  private setupStateChangeListener() {
    if (!this.audioContext) return;
    this.audioContext.onstatechange = () => {
      const state = this.audioContext!.state;
      if (this.stateChangeCallback) this.stateChangeCallback(state);
    };
  }
  private setupMasterGain() {
    if (!this.audioContext) return;
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);
    this.masterGainNode.gain.value = 1.0;
  }
  setMasterGain(value: number, rampTime?: number) {
    const gain = this.getMasterGain();
    const ctx = this.getContext();
    const v = Math.max(0, Math.min(1, value));
    if (rampTime && rampTime > 0) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(v, now + rampTime);
    } else {
      gain.gain.value = v;
    }
  }
  createBufferSource(): AudioBufferSourceNode {
    return this.getContext().createBufferSource();
  }
  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return await this.getContext().decodeAudioData(arrayBuffer);
  }
  isReady(): boolean { return this.audioContext?.state === 'running' }
}
export const audioContextManager = AudioContextManager.getInstance();
export { AudioContextManager };
