export function pcmToBase64(pcmData: Float32Array): string {
  const buffer = new ArrayBuffer(pcmData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class AudioStreamPlayer {
  private audioCtx: AudioContext;
  private nextStartTime: number;

  constructor() {
    this.audioCtx = new AudioContext({ sampleRate: 24000 });
    this.nextStartTime = 0;
  }

  playChunk(base64Audio: string) {
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    
    // Decode base64 16-bit PCM to Float32Array
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    
    const audioBuffer = this.audioCtx.createBuffer(1, pcm16.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) {
      channelData[i] = pcm16[i] / 32768.0;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioCtx.destination);
    
    if (this.nextStartTime < this.audioCtx.currentTime) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
  }
  
  clearQueue() {
    // There is no native way to cancel strictly scheduled buffers if we don't track the nodes, 
    // but the easiest way to interrupt is to suspend context and create a new one, or just reset nextStartTime.
    // We will just recreate the audio context.
    try {
      this.audioCtx.close();
    } catch (e) {}
    this.audioCtx = new AudioContext({ sampleRate: 24000 });
    this.nextStartTime = 0;
  }

  close() {
    try {
      this.audioCtx.close();
    } catch (e) {}
  }
}
