/**
 * AudioWorklet processor for capturing microphone audio.
 * Runs in a separate thread (no main-thread jank).
 *
 * Features:
 * - Converts Float32 PCM to Int16 PCM
 * - Optional VAD (Voice Activity Detection)
 * - Configurable via port messages
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // VAD settings (can be overridden via port message)
    this.vadEnabled = false;
    this.vadEnergyThreshold = 0.008;
    this.vadZeroCrossingMin = 10;
    this.vadZeroCrossingMax = 800;
    this.silentFrameCount = 0;
    this.silentFramesBeforeMute = 3;
    this.noiseFloor = 0.002;
    this.noiseAdaptationRate = 0.05;

    // Buffer to accumulate samples before sending (worklet gives 128 frames at a time)
    this.buffer = [];
    this.bufferSize = 4096;

    this.port.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'config') {
        if (data.vadEnabled !== undefined) this.vadEnabled = data.vadEnabled;
        if (data.bufferSize !== undefined) this.bufferSize = data.bufferSize;
        if (data.vadEnergyThreshold !== undefined) this.vadEnergyThreshold = data.vadEnergyThreshold;
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    // Accumulate samples
    for (let i = 0; i < channelData.length; i++) {
      this.buffer.push(channelData[i]);
    }

    // Process when buffer is full
    if (this.buffer.length >= this.bufferSize) {
      const samples = new Float32Array(this.buffer.splice(0, this.bufferSize));
      this._processChunk(samples);
    }

    return true;
  }

  _processChunk(samples) {
    let isVoice = true;
    let gateMultiplier = 1.0;

    if (this.vadEnabled) {
      // Calculate RMS energy and zero crossings
      let sumSquares = 0;
      let zeroCrossings = 0;
      let prevSample = 0;

      for (let i = 0; i < samples.length; i++) {
        sumSquares += samples[i] * samples[i];
        if ((prevSample >= 0 && samples[i] < 0) || (prevSample < 0 && samples[i] >= 0)) {
          zeroCrossings++;
        }
        prevSample = samples[i];
      }

      const rmsEnergy = Math.sqrt(sumSquares / samples.length);

      // Adaptive noise floor
      if (rmsEnergy < this.noiseFloor * 2) {
        this.noiseFloor = this.noiseFloor * (1 - this.noiseAdaptationRate) + rmsEnergy * this.noiseAdaptationRate;
      }

      const dynamicThreshold = Math.max(this.vadEnergyThreshold, this.noiseFloor * 3);
      const hasEnergy = rmsEnergy > dynamicThreshold;
      const hasNormalZC = zeroCrossings >= this.vadZeroCrossingMin && zeroCrossings <= this.vadZeroCrossingMax;
      isVoice = hasEnergy && hasNormalZC;

      if (!isVoice) {
        this.silentFrameCount++;
        if (this.silentFrameCount > this.silentFramesBeforeMute) {
          this.port.postMessage({ type: 'vad', isVoice: false });
          return;
        }
      } else {
        this.silentFrameCount = 0;
      }

      // Soft gate
      gateMultiplier = rmsEnergy > dynamicThreshold ? 1.0 : Math.pow(rmsEnergy / dynamicThreshold, 2);
      this.port.postMessage({ type: 'vad', isVoice });
    }

    // Convert Float32 to Int16
    const int16 = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      const gated = samples[i] * gateMultiplier;
      int16[i] = Math.max(-32768, Math.min(32767, gated * 32768));
    }

    // Send Int16 buffer to main thread
    this.port.postMessage(
      { type: 'audio', buffer: int16.buffer },
      [int16.buffer]
    );
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
