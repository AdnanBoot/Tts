import { Play, Square, Plus, Loader2 } from 'lucide-react';
import { VOICE_PERSONAS } from '../data/voices';
import { VoicePersonaId } from '../types/tts';

interface VoiceCastSectionProps {
  auditioningVoiceId: VoicePersonaId | null;
  playingAuditionId: VoicePersonaId | null;
  onAuditionVoice: (voiceId: VoicePersonaId) => void;
  onAddVoiceLine: (voiceId: VoicePersonaId) => void;
}

export function VoiceCastSection({
  auditioningVoiceId,
  playingAuditionId,
  onAuditionVoice,
  onAddVoiceLine,
}: VoiceCastSectionProps) {
  return (
    <section id="pemeran-suara" aria-labelledby="pemeran-heading" className="scroll-mt-20">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 id="pemeran-heading" className="font-display text-xl font-bold text-slate-900">
            01. Pemeran Suara Indonesia
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Enam karakter suara lintas generasi berbahasa Indonesia fasih, lengkap dengan logat pemuda Gen-Z.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500 tabular-nums">
          <span>6 karakter tersedia</span>
          <span aria-hidden="true" className="mx-1.5">·</span>
          <span>24 kHz WAV</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VOICE_PERSONAS.map((voice) => {
          const isLoading = auditioningVoiceId === voice.id;
          const isPlaying = playingAuditionId === voice.id;

          return (
            <article
              key={voice.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
            >
              <div>
                <div>
                  <h3 className="font-display text-base font-semibold text-slate-900">
                    {voice.label}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span>{voice.shortLabel}</span>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    <span>{voice.defaultSpeakerName}</span>
                  </p>
                </div>

                <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
                  {voice.description}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => onAuditionVoice(voice.id)}
                  disabled={isLoading}
                  aria-label={`Dengar sampel suara ${voice.label}`}
                  className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span>Memuat...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                      <Square className="h-3.5 w-3.5 fill-current text-teal-700" aria-hidden="true" />
                      <span>Hentikan</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Dengar Sampel</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onAddVoiceLine(voice.id)}
                  aria-label={`Tambahkan baris dialog untuk ${voice.label}`}
                  className="inline-flex min-h-[38px] items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-700 hover:text-teal-800 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Pakai</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
