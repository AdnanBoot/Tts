import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWavFromPcm,
  concatWavBuffers,
  createSilencePcm,
  getWavDurationSeconds,
  stripWavHeader,
} from './wav';

test('stripWavHeader extracts PCM payload from a standard 44-byte WAV', () => {
  const pcm = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const wav = buildWavFromPcm(pcm);
  assert.equal(wav.length, 52);

  const extracted = stripWavHeader(wav);
  assert.deepEqual(extracted, pcm);
});

test('concatWavBuffers stitches multiple WAV clips with silence gap and accurate headers', () => {
  const clipA = buildWavFromPcm(new Uint8Array(4800)); // 0.1s at 24kHz 16-bit mono (48000 B/s)
  const clipB = buildWavFromPcm(new Uint8Array(4800)); // 0.1s
  const stitched = concatWavBuffers([clipA, clipB], 500); // +0.5s silence

  const expectedPcmLength = 4800 + createSilencePcm(500).length + 4800;
  assert.equal(stitched.length, 44 + expectedPcmLength);
  assert.equal(Math.round(getWavDurationSeconds(stitched) * 10) / 10, 0.7);
});
