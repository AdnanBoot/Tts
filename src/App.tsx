import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { VoiceCastSection } from './components/VoiceCastSection';
import { AutoScriptColumn } from './components/AutoScriptColumn';
import { ScriptEditor } from './components/ScriptEditor';
import { MasterPlayer } from './components/MasterPlayer';
import { CONVERSATION_PRESETS, VOICE_PERSONA_MAP } from './data/voices';
import {
  ConversationPreset,
  ConversationVibe,
  DialogueLine,
  SynthesizedSegment,
  VoicePersonaId,
} from './types/tts';
import { parseScreenplay } from './utils/dialogue';
import { base64ToUint8Array } from './utils/wav';

function presetToLines(preset: ConversationPreset): DialogueLine[] {
  return preset.lines.map((item, idx) => ({
    id: `preset-${preset.id}-${idx + 1}`,
    voiceId: item.voiceId,
    speakerName: item.speakerName,
    text: item.text,
  }));
}

function base64WavToObjectUrl(base64: string): string {
  const bytes = base64ToUint8Array(base64);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export default function App() {
  const [lines, setLines] = useState<DialogueLine[]>(() =>
    presetToLines(CONVERSATION_PRESETS[0]),
  );

  // Audio playback state (single line / voice audition)
  const singleAudioRef = useRef<HTMLAudioElement | null>(null);
  const singleAudioUrlRef = useRef<string | null>(null);
  const [auditioningVoiceId, setAuditioningVoiceId] = useState<VoicePersonaId | null>(null);
  const [playingAuditionId, setPlayingAuditionId] = useState<VoicePersonaId | null>(null);
  const [synthesizingLineId, setSynthesizingLineId] = useState<string | null>(null);
  const [playingSingleLineId, setPlayingSingleLineId] = useState<string | null>(null);

  // Master conversation audio state
  const masterAudioRef = useRef<HTMLAudioElement | null>(null);
  const [masterAudioUrl, setMasterAudioUrl] = useState<string | null>(null);
  const [totalDurationSec, setTotalDurationSec] = useState<number>(0);
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isPlayingMaster, setIsPlayingMaster] = useState<boolean>(false);
  const [isSynthesizingMaster, setIsSynthesizingMaster] = useState<boolean>(false);
  const [segments, setSegments] = useState<SynthesizedSegment[]>([]);
  const [needsResync, setNeedsResync] = useState<boolean>(false);
  const [pauseMs, setPauseMs] = useState<number>(280);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  // Script AI generation/adaptation state
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [isAdaptingScript, setIsAdaptingScript] = useState<boolean>(false);

  // Feedback banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const segmentsByLineId = useMemo(() => {
    const map: Record<string, SynthesizedSegment> = {};
    for (const seg of segments) {
      map[seg.lineId] = seg;
    }
    return map;
  }, [segments]);

  const activeMasterLineId = useMemo(() => {
    if (!isPlayingMaster || segments.length === 0) {
      return null;
    }
    const found = segments.find(
      (seg) => currentTimeSec >= seg.startSec && currentTimeSec < seg.startSec + seg.durationSec + 0.08,
    );
    return found?.lineId ?? null;
  }, [isPlayingMaster, segments, currentTimeSec]);

  const activePlayingLineId = playingSingleLineId ?? activeMasterLineId;

  useEffect(() => {
    return () => {
      if (singleAudioUrlRef.current) {
        URL.revokeObjectURL(singleAudioUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (masterAudioUrl) {
        URL.revokeObjectURL(masterAudioUrl);
      }
    };
  }, [masterAudioUrl]);

  useEffect(() => {
    if (masterAudioRef.current) {
      masterAudioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const stopSingleAudio = () => {
    if (singleAudioRef.current) {
      singleAudioRef.current.pause();
      singleAudioRef.current.currentTime = 0;
    }
    setPlayingAuditionId(null);
    setPlayingSingleLineId(null);
  };

  const stopMasterAudio = () => {
    if (masterAudioRef.current) {
      masterAudioRef.current.pause();
    }
    setIsPlayingMaster(false);
  };

  const playSingleWavBase64 = async (
    base64: string,
    mode: { type: 'audition'; voiceId: VoicePersonaId } | { type: 'line'; lineId: string },
  ) => {
    stopMasterAudio();
    stopSingleAudio();

    if (singleAudioUrlRef.current) {
      URL.revokeObjectURL(singleAudioUrlRef.current);
    }
    const url = base64WavToObjectUrl(base64);
    singleAudioUrlRef.current = url;

    const audio = new Audio(url);
    audio.playbackRate = playbackRate;
    singleAudioRef.current = audio;

    audio.onended = () => {
      setPlayingAuditionId(null);
      setPlayingSingleLineId(null);
    };
    audio.onerror = () => {
      setPlayingAuditionId(null);
      setPlayingSingleLineId(null);
      setErrorMessage('Gagal memutar berkas audio WAV di browser.');
    };

    if (mode.type === 'audition') {
      setPlayingAuditionId(mode.voiceId);
    } else {
      setPlayingSingleLineId(mode.lineId);
    }

    await audio.play();
  };

  const handleAuditionVoice = async (voiceId: VoicePersonaId) => {
    setErrorMessage(null);
    if (playingAuditionId === voiceId) {
      stopSingleAudio();
      return;
    }

    const persona = VOICE_PERSONA_MAP[voiceId];
    setAuditioningVoiceId(voiceId);
    try {
      const res = await fetch('/api/tts/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId,
          text: persona.sampleText,
        }),
      });
      const data = (await res.json()) as { audioBase64?: string; error?: string };
      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || 'Gagal menghasilkan sampel suara.');
      }
      await playSingleWavBase64(data.audioBase64, { type: 'audition', voiceId });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal memutar sampel suara.');
    } finally {
      setAuditioningVoiceId(null);
    }
  };

  const handlePreviewLine = async (line: DialogueLine) => {
    setErrorMessage(null);
    if (playingSingleLineId === line.id) {
      stopSingleAudio();
      return;
    }

    // If this line was already synthesized and not edited, replay cached audio immediately
    const existingSegment = segmentsByLineId[line.id];
    if (existingSegment && !needsResync) {
      await playSingleWavBase64(existingSegment.audioBase64, { type: 'line', lineId: line.id });
      return;
    }

    setSynthesizingLineId(line.id);
    try {
      const res = await fetch('/api/tts/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: line.voiceId,
          text: line.text,
          styleOverride: line.styleOverride,
        }),
      });
      const data = (await res.json()) as {
        audioBase64?: string;
        durationSec?: number;
        error?: string;
      };
      if (!res.ok || !data.audioBase64) {
        throw new Error(data.error || 'Gagal menghasilkan suara baris dialog.');
      }
      await playSingleWavBase64(data.audioBase64, { type: 'line', lineId: line.id });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menghasilkan suara baris dialog.');
    } finally {
      setSynthesizingLineId(null);
    }
  };

  const handleSynthesizeAll = async () => {
    setErrorMessage(null);
    setStatusNotice(null);

    const validLines = lines.filter((l) => l.text.trim().length > 0);
    if (validLines.length === 0) {
      setErrorMessage('Tambahkan minimal satu baris percakapan yang berisi teks.');
      return;
    }

    stopSingleAudio();
    stopMasterAudio();
    setIsSynthesizingMaster(true);

    try {
      const res = await fetch('/api/tts/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: validLines, pauseMs }),
      });
      const data = (await res.json()) as {
        masterAudioBase64?: string;
        totalDurationSec?: number;
        segments?: SynthesizedSegment[];
        error?: string;
      };

      if (!res.ok || !data.masterAudioBase64) {
        throw new Error(data.error || 'Gagal menyusun audio percakapan.');
      }

      const nextUrl = base64WavToObjectUrl(data.masterAudioBase64);
      setMasterAudioUrl(nextUrl);
      setTotalDurationSec(data.totalDurationSec ?? 0);
      setCurrentTimeSec(0);
      setSegments(data.segments ?? []);
      setNeedsResync(false);
      setStatusNotice(
        `Berhasil menghasilkan ${validLines.length} baris percakapan. Audio siap diputar dan diunduh.`,
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menghasilkan audio percakapan.');
    } finally {
      setIsSynthesizingMaster(false);
    }
  };

  const handleTogglePlayMaster = async () => {
    if (!masterAudioRef.current || !masterAudioUrl) {
      return;
    }
    stopSingleAudio();
    if (isPlayingMaster) {
      masterAudioRef.current.pause();
      setIsPlayingMaster(false);
    } else {
      masterAudioRef.current.playbackRate = playbackRate;
      await masterAudioRef.current.play();
      setIsPlayingMaster(true);
    }
  };

  const handleSeekMaster = (timeSec: number) => {
    setCurrentTimeSec(timeSec);
    if (masterAudioRef.current) {
      masterAudioRef.current.currentTime = timeSec;
    }
  };

  const handleDownloadWav = () => {
    if (!masterAudioUrl) {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = masterAudioUrl;
    anchor.download = `percakapan-suarakita-${Date.now()}.wav`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const markScriptModified = () => {
    if (masterAudioUrl) {
      setNeedsResync(true);
    }
  };

  const handleAddVoiceLine = (voiceId: VoicePersonaId) => {
    const persona = VOICE_PERSONA_MAP[voiceId];
    const newLine: DialogueLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      voiceId,
      speakerName: persona.defaultSpeakerName,
      text: '',
    };
    setLines((prev) => [...prev, newLine]);
    markScriptModified();
    setStatusNotice(`Baris baru ditambahkan untuk karakter ${persona.label}.`);
  };

  const handleAddBlankLine = () => {
    const lastVoice = lines[lines.length - 1]?.voiceId;
    const nextVoice: VoicePersonaId =
      lastVoice === 'laki-muda' ? 'perempuan-muda' : 'laki-muda';
    handleAddVoiceLine(nextVoice);
  };

  const handleUpdateLine = (id: string, patch: Partial<DialogueLine>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
    markScriptModified();
  };

  const handleDeleteLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
    markScriptModified();
  };

  const handleMoveLine = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= lines.length) {
      return;
    }
    setLines((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    markScriptModified();
  };

  const handleClearLines = () => {
    stopSingleAudio();
    stopMasterAudio();
    setLines([]);
    setMasterAudioUrl(null);
    setSegments([]);
    setTotalDurationSec(0);
    setCurrentTimeSec(0);
    setNeedsResync(false);
  };

  const handleLoadPreset = (preset: ConversationPreset) => {
    stopSingleAudio();
    stopMasterAudio();
    setErrorMessage(null);
    setLines(presetToLines(preset));
    setMasterAudioUrl(null);
    setSegments([]);
    setNeedsResync(false);
    setStatusNotice(`Skenario "${preset.title}" dimuat ke Editor Skrip.`);
  };

  const handleGenerateScript = async (params: {
    topic: string;
    vibe: ConversationVibe;
    participants: VoicePersonaId[];
    lineCount: number;
  }) => {
    setErrorMessage(null);
    setStatusNotice(null);
    setIsGeneratingScript(true);
    try {
      const res = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { lines?: DialogueLine[]; error?: string };
      if (!res.ok || !data.lines) {
        throw new Error(data.error || 'Gagal membuat percakapan otomatis.');
      }
      setLines(data.lines);
      setMasterAudioUrl(null);
      setSegments([]);
      setNeedsResync(false);
      setStatusNotice(`Skrip otomatis (${data.lines.length} baris) berhasil dibuat.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal membuat percakapan otomatis.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleAdaptScriptAI = async (rawText: string, adaptGenZ: boolean) => {
    setErrorMessage(null);
    setStatusNotice(null);
    setIsAdaptingScript(true);
    try {
      const res = await fetch('/api/script/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, adaptGenZ }),
      });
      const data = (await res.json()) as { lines?: DialogueLine[]; error?: string };
      if (!res.ok || !data.lines) {
        throw new Error(data.error || 'Gagal mengambil dan menyesuaikan percakapan.');
      }
      setLines(data.lines);
      setMasterAudioUrl(null);
      setSegments([]);
      setNeedsResync(false);
      setStatusNotice(
        `Berhasil mengambil dan menyesuaikan ${data.lines.length} baris percakapan ke karakter suara yang sesuai.`,
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Gagal mengambil dan menyesuaikan percakapan.',
      );
    } finally {
      setIsAdaptingScript(false);
    }
  };

  const handleParseScriptLocal = (
    rawText: string,
    options?: { episodeIndex?: number; includeTextCards?: boolean },
  ) => {
    setErrorMessage(null);
    const screenplay = parseScreenplay(rawText, {
      includeTextCards: options?.includeTextCards,
    });
    if (screenplay.episodes.length === 0) {
      setErrorMessage('Tidak ada baris percakapan yang dapat dipisahkan.');
      return;
    }

    const targetEp =
      typeof options?.episodeIndex === 'number'
        ? screenplay.episodes[options.episodeIndex] ?? screenplay.episodes[0]
        : screenplay.episodes[0];

    const parsed =
      typeof options?.episodeIndex === 'number'
        ? targetEp.lines
        : screenplay.episodes.flatMap((ep) => ep.lines);

    if (parsed.length === 0) {
      setErrorMessage('Tidak ada baris dialog pada episode yang dipilih.');
      return;
    }

    setLines(parsed);
    setMasterAudioUrl(null);
    setSegments([]);
    setNeedsResync(false);
    const epLabel =
      screenplay.episodes.length > 1 && typeof options?.episodeIndex === 'number'
        ? ` (${targetEp.title})`
        : '';
    setStatusNotice(
      `${parsed.length} baris percakapan${epLabel} berhasil dipisahkan dan dipasangkan ke karakter suara.`,
    );
  };

  return (
    <div id="top" className="min-h-screen bg-slate-50 text-slate-900">
      <TopBar
        isSynthesizing={isSynthesizingMaster}
        hasLines={lines.some((l) => l.text.trim().length > 0)}
        onSynthesizeAll={handleSynthesizeAll}
      />

      {masterAudioUrl && (
        <audio
          ref={masterAudioRef}
          src={masterAudioUrl}
          onTimeUpdate={(e) => setCurrentTimeSec(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlayingMaster(false);
            setCurrentTimeSec(0);
          }}
        />
      )}

      <main className="mx-auto max-w-[1400px] space-y-8 px-4 py-7 sm:px-6 lg:px-8">
        {/* Studio Intro */}
        <section aria-labelledby="hero-heading" className="border-b border-slate-200 pb-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-wide text-teal-800">
              Studio Suara Percakapan Bahasa Indonesia · Gaya Gen-Z & Lintas Generasi
            </p>
            <h1
              id="hero-heading"
              className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-balance"
            >
              Ubah skrip percakapan Indonesia menjadi suara multi-karakter yang fasih dan hidup
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Pilih suara pemuda Gen-Z hingga Bapak, Ibu, Aki, dan Nenek sesuai karakternya, lalu ambil teks percakapan mentah atau buat dialog otomatis dalam satu meja kerja.
            </p>
          </div>
        </section>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Tutup pesan kesalahan"
              className="rounded p-1 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {statusNotice && !errorMessage && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-sm text-teal-950"
          >
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
              <span>{statusNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              aria-label="Tutup pemberitahuan"
              className="rounded p-1 text-teal-800 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Section 1: 6 Voice Personas */}
        <VoiceCastSection
          auditioningVoiceId={auditioningVoiceId}
          playingAuditionId={playingAuditionId}
          onAuditionVoice={handleAuditionVoice}
          onAddVoiceLine={handleAddVoiceLine}
        />

        {/* Section 2 & 3: Workbench Split */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <AutoScriptColumn
              isGeneratingScript={isGeneratingScript}
              isAdaptingScript={isAdaptingScript}
              onLoadPreset={handleLoadPreset}
              onGenerateScript={handleGenerateScript}
              onAdaptScriptAI={handleAdaptScriptAI}
              onParseScriptLocal={handleParseScriptLocal}
            />
          </div>

          <div className="space-y-5 lg:col-span-7">
            <MasterPlayer
              hasMasterAudio={Boolean(masterAudioUrl)}
              isSynthesizing={isSynthesizingMaster}
              isPlayingMaster={isPlayingMaster}
              currentTimeSec={currentTimeSec}
              totalDurationSec={totalDurationSec}
              pauseMs={pauseMs}
              playbackRate={playbackRate}
              hasLines={lines.some((l) => l.text.trim().length > 0)}
              needsResync={needsResync}
              onPauseMsChange={(ms) => {
                setPauseMs(ms);
                markScriptModified();
              }}
              onPlaybackRateChange={setPlaybackRate}
              onTogglePlayMaster={handleTogglePlayMaster}
              onSeekMaster={handleSeekMaster}
              onSynthesizeAll={handleSynthesizeAll}
              onDownloadWav={handleDownloadWav}
            />

            <ScriptEditor
              lines={lines}
              activePlayingLineId={activePlayingLineId}
              synthesizingLineId={synthesizingLineId}
              segmentsByLineId={segmentsByLineId}
              onAddLine={handleAddBlankLine}
              onClearLines={handleClearLines}
              onLoadStarter={() => handleLoadPreset(CONVERSATION_PRESETS[0])}
              onUpdateLine={handleUpdateLine}
              onDeleteLine={handleDeleteLine}
              onMoveLine={handleMoveLine}
              onPreviewLine={handlePreviewLine}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
