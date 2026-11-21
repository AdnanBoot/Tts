import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { VOICE_PERSONA_MAP, VOICE_PERSONAS } from './src/data/voices.ts';
import { ConversationVibe, DialogueLine, SynthesizedSegment, VoicePersonaId } from './src/types/tts.ts';
import {
  base64ToUint8Array,
  concatWavBuffers,
  getWavDurationSeconds,
  uint8ArrayToBase64,
} from './src/utils/wav.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new ApiError(
      400,
      'GEMINI_API_KEY belum tersedia. Silakan atur kunci API di panel Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const isRetryable = status === 429 || status === 503 || status === 500;
      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 450 * attempt));
    }
  }
  throw lastError;
}

function normalizeVoiceId(raw: string): VoicePersonaId {
  if (raw in VOICE_PERSONA_MAP) {
    return raw as VoicePersonaId;
  }
  return 'laki-muda';
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  if (err instanceof ApiError) {
    return { status: err.status, message: err.message };
  }
  const anyErr = err as { name?: string; status?: number; message?: string };
  const status = typeof anyErr?.status === 'number' ? anyErr.status : 500;
  const rawMessage = anyErr?.message || 'Terjadi kesalahan pada layanan Gemini API.';

  if (status === 403 || rawMessage.includes('PERMISSION_DENIED') || rawMessage.includes('API_KEY_INVALID')) {
    return {
      status,
      message:
        'Akses Gemini API ditolak atau kunci API tidak valid. Periksa pengaturan di panel Settings > Secrets.',
    };
  }
  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Batas kuota Gemini API sementara tercapai. Tunggu beberapa saat lalu coba lagi.',
    };
  }
  if (
    anyErr?.name === 'TimeoutError' ||
    anyErr?.name === 'AbortError' ||
    rawMessage.toLowerCase().includes('aborted')
  ) {
    return {
      status: 504,
      message:
        'Layanan penyusunan skrip AI melebihi batas waktu tunggu. Silakan coba lagi atau gunakan tombol "Pisahkan Baris Langsung".',
    };
  }
  return { status, message: rawMessage };
}

async function synthesizeSingleLine(
  ai: GoogleGenAI,
  params: { text: string; voiceId: VoicePersonaId; styleOverride?: string },
): Promise<{ wavBytes: Uint8Array; base64: string; durationSec: number }> {
  const persona = VOICE_PERSONA_MAP[normalizeVoiceId(params.voiceId)];
  const trimmedText = params.text.trim();
  if (!trimmedText) {
    throw new ApiError(400, 'Teks percakapan tidak boleh kosong.');
  }

  const stylePrompt = params.styleOverride?.trim()
    ? `${persona.speechStyle} Tambahan gaya: ${params.styleOverride.trim()}`
    : persona.speechStyle;

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: trimmedText,
              speechMetadata: {
                style: stylePrompt,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: persona.prebuiltVoice,
            },
          },
        },
      },
    }),
  );

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) {
    throw new ApiError(502, 'Model TTS tidak mengembalikan data audio.');
  }

  const wavBytes = base64ToUint8Array(base64Audio);
  const durationSec = getWavDurationSeconds(wavBytes);
  return { wavBytes, base64: base64Audio, durationSec };
}

async function createAppServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    res.json({
      ok: true,
      hasApiKey: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    });
  });

  app.post('/api/script/generate', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      const {
        topic = 'Nongkrong santai lintas generasi sambil bahas tren Gen-Z',
        vibe = 'gen-z-gaul',
        participants = ['laki-muda', 'perempuan-muda', 'laki-bapak', 'perempuan-ibu'],
        lineCount = 6,
      } = req.body as {
        topic?: string;
        vibe?: ConversationVibe;
        participants?: VoicePersonaId[];
        lineCount?: number;
      };

      const validParticipants = (Array.isArray(participants) ? participants : [])
        .filter((id): id is VoicePersonaId => id in VOICE_PERSONA_MAP);
      const selectedVoices =
        validParticipants.length > 0
          ? validParticipants.map((id) => VOICE_PERSONA_MAP[id])
          : VOICE_PERSONAS.slice(0, 4);

      const safeLineCount = Math.max(2, Math.min(12, Number(lineCount) || 6));

      const vibeGuide: Record<ConversationVibe, string> = {
        'gen-z-gaul':
          'Pemuda & pemudi wajib memakai gaya bahasa Indonesia Gen-Z Jakarta yang fasih, natural, santai (contoh: jujurly, valid, FOMO, spill, vibes, gaspol, bestie, literally, ngab) sementara generasi lebih tua merespons sesuai karakter usianya.',
        'lintas-generasi':
          'Percakapan hangat dan lucu lintas generasi di Indonesia: anak muda memakai bahasa gaul Gen-Z, Bapak & Ibu berbicara santun hangat, Aki & Nenek berbicara lembut dan bijak.',
        'komedi-keluarga':
          'Dialog komedi keluarga Indonesia yang akrab, ada salah paham lucu antara istilah gaul Gen-Z dan tanggapan Bapak/Ibu/Aki/Nenek.',
        'santai-warung':
          'Suasana obrolan santai di warung kopi atau teras rumah Indonesia, natural, ekspresif, dan akrab.',
      };

      const personaCatalog = selectedVoices
        .map((v) => `- voiceId: "${v.id}" | Karakter: ${v.label} (${v.ageGroup}) | Nama default: ${v.defaultSpeakerName}`)
        .join('\n');

      const prompt = `Buat skrip percakapan bahasa Indonesia yang sangat natural, fasih, dan hidup sebanyak ${safeLineCount} baris giliran bicara.
Topik: ${topic}
Gaya bahasa: ${vibeGuide[vibe] || vibeGuide['gen-z-gaul']}

Karakter suara yang boleh dipakai (HANYA gunakan voiceId dari daftar ini):
${personaCatalog}

Aturan penulisan:
1. Setiap baris maksimal 1-2 kalimat singkat agar enak didengar sebagai TTS percakapan.
2. Gunakan tanda ekspresi suara secara hemat bila cocok: <laugh>, <breath>, <sigh>, atau respon singkat seperti |iya|, |hmm|.
3. Pastikan gaya bicara tiap karakter benar-benar sesuai usianya (Laki-laki muda & Perempuan muda terdengar seperti Gen-Z Indonesia asli; Bapak & Ibu dewasa hangat; Aki-aki tua & Nenek lembut dan berkarakter lansia).`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            abortSignal: AbortSignal.timeout(20000),
            systemInstruction:
              'Kamu adalah penulis naskah dialog audio drama & podcast Indonesia yang ahli logat Gen-Z dan percakapan lintas generasi.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  voiceId: {
                    type: Type.STRING,
                    description: 'Harus salah satu dari: laki-muda, laki-bapak, laki-aki, perempuan-muda, perempuan-ibu, perempuan-nenek',
                  },
                  speakerName: {
                    type: Type.STRING,
                    description: 'Nama panggilan pembicara',
                  },
                  text: {
                    type: Type.STRING,
                    description: 'Kalimat dialog bahasa Indonesia yang natural',
                  },
                },
                required: ['voiceId', 'speakerName', 'text'],
              },
            },
          },
        }),
      );

      const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
        voiceId: string;
        speakerName: string;
        text: string;
      }>;

      const lines: DialogueLine[] = parsed.map((item, idx) => {
        const voiceId = normalizeVoiceId(item.voiceId);
        return {
          id: `gen-${Date.now()}-${idx + 1}`,
          voiceId,
          speakerName: item.speakerName?.trim() || VOICE_PERSONA_MAP[voiceId].defaultSpeakerName,
          text: item.text?.trim() || '',
        };
      }).filter((l) => l.text.length > 0);

      res.json({ lines });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/script/adapt', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      const { rawText, adaptGenZ = true } = req.body as {
        rawText?: string;
        adaptGenZ?: boolean;
      };

      if (!rawText || !rawText.trim()) {
        throw new ApiError(400, 'Masukkan teks percakapan terlebih dahulu untuk diambil dan disesuaikan.');
      }

      const personaList = VOICE_PERSONAS.map(
        (v) => `- "${v.id}": ${v.label} (${v.description})`,
      ).join('\n');

      const prompt = `Ambil teks percakapan mentah di bawah ini, pecah menjadi baris dialog terstruktur, lalu pilihkan voiceId yang paling cocok dari 6 karakter suara berikut:
${personaList}

Instruksi penyesuaian:
${
  adaptGenZ
    ? '- Poles dialog agar terdengar fasih berbahasa Indonesia lisan. Untuk pembicara muda (laki-muda / perempuan-muda), sesuaikan ke gaya bahasa pemuda Gen-Z Indonesia yang natural dan gaul. Untuk Bapak/Ibu/Aki/Nenek, pertahankan tutur kata khas usia masing-masing tanpa mengubah inti maksud kalimat.'
    : '- Pertahankan kalimat asli seakurat mungkin sambil merapikan tanda baca lisan agar enak dibaca TTS, dan petakan pembicara ke voiceId yang paling pas.'
}
- Jika terdapat timecode di awal baris (seperti 00–07 atau 07–17), bersihkan timecode tersebut. Abaikan baris header judul, EPISODE, TEKS layar, dan daftar PANDUAN SUARA agar tidak ikut dibacakan, tetapi manfaatkan catatan PANDUAN SUARA sebagai referensi karakter.
- Tambahkan maksimal 1-2 cue ekspresi (<laugh>, <breath>, |iya|) hanya jika benar-benar pas dengan emosi dialog.

Teks percakapan mentah:
"""
${rawText.trim()}
"""`;

      const response = await withRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            abortSignal: AbortSignal.timeout(20000),
            systemInstruction:
              'Kamu adalah editor naskah percakapan TTS Indonesia. Ubah teks mentah menjadi daftar dialog terstruktur dalam JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  voiceId: { type: Type.STRING },
                  speakerName: { type: Type.STRING },
                  text: { type: Type.STRING },
                },
                required: ['voiceId', 'speakerName', 'text'],
              },
            },
          },
        }),
      );

      const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
        voiceId: string;
        speakerName: string;
        text: string;
      }>;

      const lines: DialogueLine[] = parsed
        .map((item, idx) => {
          const voiceId = normalizeVoiceId(item.voiceId);
          return {
            id: `adapt-${Date.now()}-${idx + 1}`,
            voiceId,
            speakerName: item.speakerName?.trim() || VOICE_PERSONA_MAP[voiceId].defaultSpeakerName,
            text: item.text?.trim() || '',
          };
        })
        .filter((l) => l.text.length > 0);

      res.json({ lines });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/tts/line', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      const { text, voiceId, styleOverride } = req.body as {
        text?: string;
        voiceId?: VoicePersonaId;
        styleOverride?: string;
      };

      const synth = await synthesizeSingleLine(ai, {
        text: text || '',
        voiceId: voiceId || 'laki-muda',
        styleOverride,
      });

      res.json({
        audioBase64: synth.base64,
        mimeType: 'audio/wav',
        durationSec: synth.durationSec,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/tts/conversation', async (req: Request, res: Response) => {
    try {
      const ai = getAiClient();
      const { lines, pauseMs = 280 } = req.body as {
        lines?: DialogueLine[];
        pauseMs?: number;
      };

      const validLines = (Array.isArray(lines) ? lines : []).filter(
        (line) => line.text && line.text.trim().length > 0,
      );

      if (validLines.length === 0) {
        throw new ApiError(400, 'Tambahkan minimal satu baris percakapan sebelum menghasilkan suara.');
      }

      if (validLines.length > 20) {
        throw new ApiError(400, 'Maksimal 20 baris percakapan dalam satu kali proses sintesis.');
      }

      const safePauseMs = Math.max(0, Math.min(1200, Number(pauseMs) || 280));
      const clipResults: Array<{
        line: DialogueLine;
        wavBytes: Uint8Array;
        base64: string;
        durationSec: number;
      }> = new Array(validLines.length);

      // Process in batches of 2 to balance speed and API concurrency limits
      const concurrency = 2;
      for (let i = 0; i < validLines.length; i += concurrency) {
        const batch = validLines.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (line, offset) => {
            const synth = await synthesizeSingleLine(ai, {
              text: line.text,
              voiceId: line.voiceId,
              styleOverride: line.styleOverride,
            });
            clipResults[i + offset] = {
              line,
              wavBytes: synth.wavBytes,
              base64: synth.base64,
              durationSec: synth.durationSec,
            };
          }),
        );
      }

      const masterWav = concatWavBuffers(
        clipResults.map((r) => r.wavBytes),
        safePauseMs,
      );

      const pauseSec = safePauseMs / 1000;
      let cursorSec = 0;
      const segments: SynthesizedSegment[] = clipResults.map((result, idx) => {
        const segment: SynthesizedSegment = {
          lineId: result.line.id,
          voiceId: result.line.voiceId,
          speakerName: result.line.speakerName,
          audioBase64: result.base64,
          startSec: cursorSec,
          durationSec: result.durationSec,
        };
        cursorSec += result.durationSec + (idx < clipResults.length - 1 ? pauseSec : 0);
        return segment;
      });

      res.json({
        masterAudioBase64: uint8ArrayToBase64(masterWav),
        mimeType: 'audio/wav',
        totalDurationSec: getWavDurationSeconds(masterWav),
        pauseMs: safePauseMs,
        segments,
      });
    } catch (err) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SuaraKita Studio server listening on http://localhost:${PORT}`);
  });
}

createAppServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
