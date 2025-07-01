let audioContext: AudioContext | null = null;
let micStream: MediaStreamAudioSourceNode | null = null;
let gainNode: GainNode | null = null;
let convolverNode: ConvolverNode | null = null;
let delayNode: DelayNode | null = null;
let biquadFilter: BiquadFilterNode | null = null;
let pitchShifterNode: AudioNode | null = null;

let finalNode: AudioNode | null = null;
let currentPitch = 1.0;

export { audioContext, micStream }; // ✅ Export for visualizer and signal chain

// ✅ Simple pitch shifter using Web Audio API primitives
function createSimplePitchShifter(context: AudioContext, pitchRatio: number): AudioNode {
  const scriptNode = context.createScriptProcessor(2048, 1, 1);
  const bufferSize = 8192;
  const buffer = new Float32Array(bufferSize);
  let writeIndex = 0;
  let readIndex = 0;
  let isBufferFilled = false;

  scriptNode.onaudioprocess = (event) => {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    const inputData = inputBuffer.getChannelData(0);
    const outputData = outputBuffer.getChannelData(0);

    for (let i = 0; i < inputData.length; i++) {
      buffer[writeIndex] = inputData[i];
      writeIndex = (writeIndex + 1) % bufferSize;
      if (writeIndex === 0) isBufferFilled = true;
    }

    if (isBufferFilled) {
      for (let i = 0; i < outputData.length; i++) {
        const index = Math.floor(readIndex);
        const fraction = readIndex - index;
        const idx1 = index % bufferSize;
        const idx2 = (index + 1) % bufferSize;
        outputData[i] = buffer[idx1] * (1 - fraction) + buffer[idx2] * fraction;
        readIndex += pitchRatio;
        if (readIndex >= bufferSize) readIndex -= bufferSize;
      }
    } else {
      outputData.fill(0);
    }
  };

  return scriptNode;
}

export async function startMic() {
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStream = audioContext.createMediaStreamSource(stream);

    gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;

    convolverNode = audioContext.createConvolver();
    convolverNode.buffer = await getImpulseResponse(audioContext);

    delayNode = audioContext.createDelay();
    delayNode.delayTime.value = 0.2;

    biquadFilter = audioContext.createBiquadFilter();
    biquadFilter.type = 'lowpass';
    biquadFilter.frequency.value = 20000;

    pitchShifterNode = createSimplePitchShifter(audioContext, currentPitch);

    micStream.connect(gainNode);
    gainNode.connect(convolverNode);
    convolverNode.connect(delayNode);
    delayNode.connect(biquadFilter);
    biquadFilter.connect(pitchShifterNode);
    pitchShifterNode.connect(audioContext.destination);

    finalNode = pitchShifterNode;
    console.log('🎤 Mic started with pitch shifter');
  } catch (err) {
    console.error('❌ Failed to start mic:', err);
    alert('Microphone access denied or unavailable. Please check browser permissions.');
  }
}

export function stopMic() {
  [micStream, gainNode, convolverNode, delayNode, biquadFilter, pitchShifterNode].forEach(node => {
    if (node) node.disconnect();
  });

  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
  }

  audioContext = null;
  micStream = null;
  gainNode = null;
  convolverNode = null;
  delayNode = null;
  biquadFilter = null;
  pitchShifterNode = null;
  finalNode = null;

  console.log('🛑 Microphone stopped');
}

export function setGainLevel(value: number) {
  if (gainNode) gainNode.gain.value = value;
}

export function setDelayTime(value: number) {
  if (delayNode) delayNode.delayTime.value = value;
}

export function setFilterType(type: BiquadFilterType) {
  if (biquadFilter) biquadFilter.type = type;
}

export function setFilterFrequency(value: number) {
  if (biquadFilter) biquadFilter.frequency.value = value;
}

export async function setPitch(value: number) {
  currentPitch = value;
  console.log(`🎚️ Changing pitch to ${value}x`);

  if (audioContext && pitchShifterNode && biquadFilter) {
    biquadFilter.disconnect();
    pitchShifterNode.disconnect();
    pitchShifterNode = createSimplePitchShifter(audioContext, currentPitch);
    biquadFilter.connect(pitchShifterNode);
    pitchShifterNode.connect(audioContext.destination);
    finalNode = pitchShifterNode;
    console.log(`🎵 Pitch updated to ${value}x`);
  }
}

async function getImpulseResponse(context: AudioContext): Promise<AudioBuffer> {
  try {
    const response = await fetch('/impulse.wav');
    const arraybuffer = await response.arrayBuffer();
    return await context.decodeAudioData(arraybuffer);
  } catch (error) {
    console.warn('Failed to load impulse response, creating synthetic reverb:', error);

    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(2, length, context.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 3);
      const noise = (Math.random() * 2 - 1) * decay * 0.2;
      left[i] = noise;
      right[i] = noise * 0.8;
    }

    return buffer;
  }
}
