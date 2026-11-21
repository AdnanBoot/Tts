const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTE_RATE = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
const BLOCK_ALIGN = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);

/**
 * Extracts raw PCM data bytes from a WAV container by locating the "data" subchunk,
 * falling back to stripping the standard 44-byte RIFF header if needed.
 */
export function stripWavHeader(wavBytes: Uint8Array): Uint8Array {
  if (wavBytes.length <= 44) {
    return new Uint8Array(0);
  }

  // Verify RIFF/WAVE signature
  const isRiff =
    wavBytes[0] === 0x52 &&
    wavBytes[1] === 0x49 &&
    wavBytes[2] === 0x46 &&
    wavBytes[3] === 0x46;

  if (!isRiff) {
    // Already raw PCM
    return wavBytes;
  }

  const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);
  let offset = 12; // Skip "RIFF", ChunkSize, "WAVE"

  while (offset + 8 <= wavBytes.length) {
    const chunkId = String.fromCharCode(
      wavBytes[offset],
      wavBytes[offset + 1],
      wavBytes[offset + 2],
      wavBytes[offset + 3],
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'data') {
      const dataStart = offset + 8;
      const dataEnd = Math.min(dataStart + chunkSize, wavBytes.length);
      return wavBytes.slice(dataStart, dataEnd);
    }

    // Chunks are word-aligned (padded to even byte count)
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  return wavBytes.slice(44);
}

/**
 * Generates zeroed 16-bit mono PCM silence at 24kHz.
 */
export function createSilencePcm(durationMs: number, sampleRate = SAMPLE_RATE): Uint8Array {
  if (durationMs <= 0) {
    return new Uint8Array(0);
  }
  const sampleCount = Math.round((sampleRate * durationMs) / 1000);
  return new Uint8Array(sampleCount * (BITS_PER_SAMPLE / 8));
}

/**
 * Computes audio duration in seconds from PCM byte length (24kHz, mono, 16-bit).
 */
export function getWavDurationSeconds(wavBytes: Uint8Array): number {
  const pcm = stripWavHeader(wavBytes);
  return pcm.length / BYTE_RATE;
}

/**
 * Wraps raw 24kHz 16-bit mono PCM bytes with a valid 44-byte RIFF/WAVE header.
 */
export function buildWavFromPcm(pcmBytes: Uint8Array, sampleRate = SAMPLE_RATE): Uint8Array {
  const byteRate = sampleRate * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const totalSize = 44 + pcmBytes.length;
  const output = new Uint8Array(totalSize);
  const view = new DataView(output.buffer);

  // RIFF chunk descriptor
  writeAscii(output, 0, 'RIFF');
  view.setUint32(4, 36 + pcmBytes.length, true);
  writeAscii(output, 8, 'WAVE');

  // fmt subchunk
  writeAscii(output, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, BLOCK_ALIGN, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // data subchunk
  writeAscii(output, 36, 'data');
  view.setUint32(40, pcmBytes.length, true);
  output.set(pcmBytes, 44);

  return output;
}

/**
 * Concatenates multiple WAV clips into a single WAV file with optional silence pauses between clips.
 */
export function concatWavBuffers(wavClips: Uint8Array[], pauseMs = 280): Uint8Array {
  if (wavClips.length === 0) {
    return buildWavFromPcm(new Uint8Array(0));
  }

  const pcmSegments: Uint8Array[] = [];
  const pausePcm = createSilencePcm(pauseMs);
  let totalPcmBytes = 0;

  wavClips.forEach((clip, idx) => {
    const pcm = stripWavHeader(clip);
    pcmSegments.push(pcm);
    totalPcmBytes += pcm.length;

    if (idx < wavClips.length - 1 && pausePcm.length > 0) {
      pcmSegments.push(pausePcm);
      totalPcmBytes += pausePcm.length;
    }
  });

  const mergedPcm = new Uint8Array(totalPcmBytes);
  let cursor = 0;
  for (const segment of pcmSegments) {
    mergedPcm.set(segment, cursor);
    cursor += segment.length;
  }

  return buildWavFromPcm(mergedPcm);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

function writeAscii(target: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    target[offset + i] = text.charCodeAt(i);
  }
}
