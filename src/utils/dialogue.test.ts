import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateScriptStats,
  formatDuration,
  inferPersonaFromSpeaker,
  insertExpressionCue,
  parseRawConversation,
  parseScreenplay,
  stripTimecodePrefix,
} from './dialogue';

test('inferPersonaFromSpeaker maps all 6 Indonesian character archetypes and screenplay roles accurately', () => {
  assert.equal(inferPersonaFromSpeaker('Aki Dadang'), 'laki-aki');
  assert.equal(inferPersonaFromSpeaker('KI JAGA'), 'laki-aki');
  assert.equal(inferPersonaFromSpeaker('Nenek Murni'), 'perempuan-nenek');
  assert.equal(inferPersonaFromSpeaker('Pak Hendra'), 'laki-bapak');
  assert.equal(inferPersonaFromSpeaker('NARATOR'), 'laki-bapak');
  assert.equal(inferPersonaFromSpeaker('Bu Sari'), 'perempuan-ibu');
  assert.equal(inferPersonaFromSpeaker('UNI SALMA'), 'perempuan-ibu');
  assert.equal(inferPersonaFromSpeaker('NARA'), 'perempuan-muda');
  assert.equal(inferPersonaFromSpeaker('ARGA'), 'laki-muda');
});

test('stripTimecodePrefix removes screenplay timecodes cleanly', () => {
  assert.equal(stripTimecodePrefix('00–07 NARATOR: Di sebuah kawasan adat.'), 'NARATOR: Di sebuah kawasan adat.');
  assert.equal(stripTimecodePrefix('07-17 LEMBA: Hutan ini bukan sekadar tempat.'), 'LEMBA: Hutan ini bukan sekadar tempat.');
});

test('parseScreenplay splits episodes, skips TEKS cards by default, and applies PANDUAN SUARA styles', () => {
  const script = `NASKAH PERCAKAPAN & NARASI — SEASON 1
MISTERI PAMALI NUSANTARA
Durasi target sekitar 60 detik per episode. Naskah fiksi.

EPISODE 1 — HUTAN YANG TIDAK BOLEH DIAMBIL
00–07 NARATOR: Di sebuah kawasan adat, ada aturan turun-temurun.
07–17 LEMBA: Hutan ini harus kita hormati.
ARGA: Kalau ambil rotan sedikit, apa salahnya?
NARA: Arga, jangan.
TEKS: SATU DARI DELAPAN TANDA TELAH TERBUKA.

EPISODE 6 — SUARA DARI RUANG KOSONG
00–07 NARATOR: Terdengar suara anak kecil menangis.
KI JAGA: Kalian sudah menemukan yang pertama.

PANDUAN SUARA
Narator: dewasa, tenang, misterius, jelas.
Arga: pria muda, kritis, natural.
Nara: wanita muda, tenang, ekspresif.
Ki Jaga: pria tua, rendah, lambat, berwibawa.`;

  const parsed = parseScreenplay(script);
  assert.equal(parsed.episodes.length, 2);
  assert.equal(parsed.skippedTextCards, 1);
  assert.equal(parsed.episodes[0].title, 'EPISODE 1 — HUTAN YANG TIDAK BOLEH DIAMBIL');
  assert.equal(parsed.episodes[0].lines.length, 4);
  assert.equal(parsed.episodes[0].lines[0].speakerName, 'NARATOR');
  assert.equal(parsed.episodes[0].lines[0].styleOverride, 'dewasa, tenang, misterius, jelas.');
  assert.equal(parsed.episodes[0].lines[2].voiceId, 'laki-muda');
  assert.equal(parsed.episodes[0].lines[3].voiceId, 'perempuan-muda');
  assert.equal(parsed.episodes[1].lines[1].voiceId, 'laki-aki');
  assert.equal(parsed.episodes[1].lines[1].styleOverride, 'pria tua, rendah, lambat, berwibawa.');
});

test('parseRawConversation parses multi-speaker lines and keeps consistent speaker mapping', () => {
  const raw = [
    'Raka: Jujurly tempat ini keren banget bro!',
    'Nenek: Pelan-pelan ngomongnya ya cu.',
    'Raka: Siap Nek, hehe.',
  ].join('\n');

  const lines = parseRawConversation(raw);
  assert.equal(lines.length, 3);
  assert.equal(lines[0].voiceId, 'laki-muda');
  assert.equal(lines[1].voiceId, 'perempuan-nenek');
  assert.equal(lines[2].voiceId, 'laki-muda');
  assert.equal(lines[2].text, 'Siap Nek, hehe.');
});

test('estimateScriptStats counts words, unique speakers, and duration cleanly', () => {
  const stats = estimateScriptStats([
    { id: '1', voiceId: 'laki-muda', speakerName: 'Raka', text: 'Halo guys <laugh> apa kabar semua' },
    { id: '2', voiceId: 'perempuan-ibu', speakerName: 'Bu Sari', text: 'Baik nak |iya|' },
  ]);

  assert.equal(stats.lineCount, 2);
  assert.equal(stats.speakerCount, 2);
  assert.equal(stats.wordCount, 8);
  assert.ok(stats.estimatedSeconds >= 3);
});

test('insertExpressionCue and formatDuration format cleanly', () => {
  assert.equal(insertExpressionCue('Halo bro', '<laugh>'), 'Halo bro <laugh>');
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(75), '01:15');
});
