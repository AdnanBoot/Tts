import { useMemo, useState } from 'react';
import { Loader2, Wand2, FileText, SplitSquareHorizontal } from 'lucide-react';
import { CONVERSATION_PRESETS, VOICE_PERSONAS } from '../data/voices';
import { ConversationPreset, ConversationVibe, VoicePersonaId } from '../types/tts';
import { parseScreenplay } from '../utils/dialogue';

interface AutoScriptColumnProps {
  isGeneratingScript: boolean;
  isAdaptingScript: boolean;
  onLoadPreset: (preset: ConversationPreset) => void;
  onGenerateScript: (params: {
    topic: string;
    vibe: ConversationVibe;
    participants: VoicePersonaId[];
    lineCount: number;
  }) => void;
  onAdaptScriptAI: (rawText: string, adaptGenZ: boolean) => void;
  onParseScriptLocal: (
    rawText: string,
    options?: { episodeIndex?: number; includeTextCards?: boolean },
  ) => void;
}

const SAMPLE_RAW_DIALOGUE = `Raka: Bro sumpah tadi macet parah banget di Sudirman, aku hampir telat.
Nadia: Ih sama bestie! Aku juga baru nyampe sambil lari-lari kecil gitu.
Pak Hendra: Lain kali berangkat agak pagian ya, Nak, biar nggak buru-buru di jalan.
Bu Sari: Betul kata Bapak, ini Ibu sudah bikinin teh hangat buat kalian berdua.
Aki Dadang: Duduk dulu napas dulu, anak muda kalau lari terus nanti kakinya pegal.
Nenek Murni: Nah iya, minum dulu tehnya pelan-pelan mumpung masih hangat ya cucu-cucu Nenek.`;

export function AutoScriptColumn({
  isGeneratingScript,
  isAdaptingScript,
  onLoadPreset,
  onGenerateScript,
  onAdaptScriptAI,
  onParseScriptLocal,
}: AutoScriptColumnProps) {
  const [activeTab, setActiveTab] = useState<'generate' | 'adapt'>('adapt');

  // Tab 1 state: Auto-generate conversation
  const [topic, setTopic] = useState(
    'Anak Gen-Z ngajarin Bapak, Ibu, Aki, dan Nenek istilah gaul viral sambil minum kopi sore',
  );
  const [vibe, setVibe] = useState<ConversationVibe>('gen-z-gaul');
  const [participants, setParticipants] = useState<VoicePersonaId[]>([
    'laki-muda',
    'perempuan-muda',
    'laki-bapak',
    'perempuan-ibu',
    'laki-aki',
    'perempuan-nenek',
  ]);
  const [lineCount, setLineCount] = useState<number>(6);

  // Tab 2 state: Auto-parse & adapt raw conversation column
  const [rawText, setRawText] = useState<string>(SAMPLE_RAW_DIALOGUE);
  const [adaptGenZ, setAdaptGenZ] = useState<boolean>(true);
  const [includeTextCards, setIncludeTextCards] = useState<boolean>(false);
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState<number>(0);

  const detectedScreenplay = useMemo(
    () => parseScreenplay(rawText, { includeTextCards }),
    [rawText, includeTextCards],
  );
  const hasMultipleEpisodes = detectedScreenplay.episodes.length > 1;
  const safeEpisodeIdx =
    selectedEpisodeIdx < detectedScreenplay.episodes.length ? selectedEpisodeIdx : 0;
  const voiceGuideCount = Object.keys(detectedScreenplay.voiceGuide).length;

  const toggleParticipant = (voiceId: VoicePersonaId) => {
    setParticipants((prev) => {
      if (prev.includes(voiceId)) {
        return prev.length > 1 ? prev.filter((id) => id !== voiceId) : prev;
      }
      return [...prev, voiceId];
    });
  };

  return (
    <aside
      id="generator-otomatis"
      aria-labelledby="auto-col-heading"
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 scroll-mt-20"
    >
      <div className="mb-4">
        <h2 id="auto-col-heading" className="font-display text-lg font-bold text-slate-900">
          02. Kolom Percakapan Otomatis
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Ambil teks percakapan mentah lalu sesuaikan suara otomatis, atau buat skrip Gen-Z baru dari topik.
        </p>
      </div>

      {/* Mode Switch Tabs */}
      <div
        role="tablist"
        aria-label="Mode input percakapan otomatis"
        className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'adapt'}
          onClick={() => setActiveTab('adapt')}
          className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
            activeTab === 'adapt'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Ambil & Sesuaikan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'generate'}
          onClick={() => setActiveTab('generate')}
          className={`min-h-[38px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
            activeTab === 'generate'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Buat Skrip Otomatis
        </button>
      </div>

      {activeTab === 'adapt' ? (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="raw-conversation-input" className="text-sm font-semibold text-slate-800">
                Tempel atau Isi Percakapan
              </label>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_RAW_DIALOGUE)}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 hover:underline whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
              >
                Isi Contoh Dialog
              </button>
            </div>

            <textarea
              id="raw-conversation-input"
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setSelectedEpisodeIdx(0);
              }}
              rows={9}
              placeholder="Tempel percakapan biasa atau naskah ber-episode (contoh: 00–07 NARATOR: ... / EPISODE 1 ... / PANDUAN SUARA ...)"
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            />

            <p className="text-[11px] leading-relaxed text-slate-500">
              Mendukung naskah drama &amp; narasi langsung (otomatis membersihkan timecode seperti 00–07, memisahkan EPISODE, dan membaca PANDUAN SUARA).
            </p>

            {(hasMultipleEpisodes || voiceGuideCount > 0 || detectedScreenplay.skippedTextCards > 0) && (
              <div className="space-y-2.5 border-t border-slate-100 pt-3">
                {hasMultipleEpisodes && (
                  <div>
                    <label htmlFor="episode-select" className="block text-xs font-semibold text-slate-800">
                      Episode Terdeteksi ({detectedScreenplay.episodes.length} episode)
                    </label>
                    <select
                      id="episode-select"
                      value={safeEpisodeIdx}
                      onChange={(e) => setSelectedEpisodeIdx(Number(e.target.value))}
                      className="mt-1 h-[38px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    >
                      {detectedScreenplay.episodes.map((ep, idx) => (
                        <option key={ep.id} value={idx}>
                          {ep.title} ({ep.lines.length} baris)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                  {voiceGuideCount > 0 && (
                    <span>Panduan suara aktif untuk {voiceGuideCount} tokoh</span>
                  )}
                  {(detectedScreenplay.skippedTextCards > 0 || includeTextCards) && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={includeTextCards}
                        onChange={(e) => setIncludeTextCards(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      />
                      <span>Sertakan baris TEKS layar</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 border-t border-slate-100 pt-3">
              <input
                type="checkbox"
                checked={adaptGenZ}
                onChange={(e) => setAdaptGenZ(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              />
              <span className="text-xs leading-relaxed text-slate-600">
                <strong className="block font-semibold text-slate-900">
                  Sesuaikan ke Bahasa Indonesia Fasih &amp; Gaya Gen-Z
                </strong>
                Memoles kalimat pembicara muda ke gaya Gen-Z alami serta mencocokkan suara Laki-laki/Perempuan Muda, Bapak/Ibu, hingga Aki/Nenek secara otomatis.
              </span>
            </label>
          </div>

          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => onAdaptScriptAI(rawText, adaptGenZ)}
              disabled={isAdaptingScript || !rawText.trim()}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              {isAdaptingScript ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Mengambil &amp; Menyesuaikan...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" aria-hidden="true" />
                  <span>Ambil &amp; Sesuaikan (Otomatis)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                onParseScriptLocal(rawText, {
                  episodeIndex: hasMultipleEpisodes ? safeEpisodeIdx : undefined,
                  includeTextCards,
                })
              }
              disabled={!rawText.trim()}
              className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {hasMultipleEpisodes
                  ? `Muat Episode ${safeEpisodeIdx + 1} ke Editor (Instan)`
                  : 'Pisahkan Baris Langsung (Tanpa Ubah Kata)'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="topic-input" className="block text-sm font-semibold text-slate-800">
                Topik Percakapan
              </label>
              <textarea
                id="topic-input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="Misal: Cucu ngajarin Nenek dan Aki cara pesan makanan lewat aplikasi..."
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="vibe-select" className="block text-xs font-semibold text-slate-700">
                  Gaya Bahasa
                </label>
                <select
                  id="vibe-select"
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value as ConversationVibe)}
                  className="mt-1 h-[38px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value="gen-z-gaul">Pemuda Gen-Z Gaul</option>
                  <option value="lintas-generasi">Lintas Generasi</option>
                  <option value="komedi-keluarga">Komedi Keluarga</option>
                  <option value="santai-warung">Santai Warung Kopi</option>
                </select>
              </div>

              <div>
                <label htmlFor="line-count-select" className="block text-xs font-semibold text-slate-700">
                  Jumlah Baris
                </label>
                <select
                  id="line-count-select"
                  value={lineCount}
                  onChange={(e) => setLineCount(Number(e.target.value))}
                  className="mt-1 h-[38px] w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                >
                  <option value={4}>4 baris dialog</option>
                  <option value={6}>6 baris dialog</option>
                  <option value={8}>8 baris dialog</option>
                  <option value={10}>10 baris dialog</option>
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700">
                Karakter yang Ikut Berbicara
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {VOICE_PERSONAS.map((voice) => {
                  const selected = participants.includes(voice.id);
                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => toggleParticipant(voice.id)}
                      aria-pressed={selected}
                      className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
                        selected
                          ? 'border-teal-700 bg-teal-50/80 text-teal-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {voice.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onGenerateScript({ topic, vibe, participants, lineCount })}
            disabled={isGeneratingScript || !topic.trim()}
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            {isGeneratingScript ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Menyusun Skrip...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                <span>Buat Percakapan Otomatis</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Curated Presets */}
      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <FileText className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          <span>Template Skenario Siap Pakai</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {CONVERSATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onLoadPreset(preset)}
              className="flex min-h-[38px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-left text-xs font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <span className="truncate">{preset.title}</span>
              <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
                {preset.lines.length} baris
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
