import { ArrowDown, ArrowUp, Loader2, Play, Plus, Square, Trash2 } from 'lucide-react';
import { EXPRESSION_CUES, VOICE_PERSONA_MAP, VOICE_PERSONAS } from '../data/voices';
import { DialogueLine, SynthesizedSegment, VoicePersonaId } from '../types/tts';
import { estimateScriptStats, formatDuration, insertExpressionCue } from '../utils/dialogue';

interface ScriptEditorProps {
  lines: DialogueLine[];
  activePlayingLineId: string | null;
  synthesizingLineId: string | null;
  segmentsByLineId: Record<string, SynthesizedSegment>;
  onAddLine: () => void;
  onClearLines: () => void;
  onLoadStarter: () => void;
  onUpdateLine: (id: string, patch: Partial<DialogueLine>) => void;
  onDeleteLine: (id: string) => void;
  onMoveLine: (index: number, direction: -1 | 1) => void;
  onPreviewLine: (line: DialogueLine) => void;
}

export function ScriptEditor({
  lines,
  activePlayingLineId,
  synthesizingLineId,
  segmentsByLineId,
  onAddLine,
  onClearLines,
  onLoadStarter,
  onUpdateLine,
  onDeleteLine,
  onMoveLine,
  onPreviewLine,
}: ScriptEditorProps) {
  const stats = estimateScriptStats(lines);

  return (
    <section
      id="editor-skrip"
      aria-labelledby="editor-heading"
      className="flex flex-col rounded-xl border border-slate-200 bg-white scroll-mt-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 id="editor-heading" className="font-display text-lg font-bold text-slate-900">
            04. Editor Skrip Percakapan
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
            <span>{stats.lineCount} baris</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{stats.speakerCount} karakter</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{stats.wordCount} kata</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>Estimasi {formatDuration(stats.estimatedSeconds)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddLine}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Tambah Baris</span>
          </button>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={onClearLines}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
            >
              <span>Kosongkan</span>
            </button>
          )}
        </div>
      </div>

      {lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <p className="font-display text-base font-semibold text-slate-900">
            Skrip percakapan masih kosong
          </p>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            Tambahkan baris dialog secara manual, atau tempel teks mentah di Kolom Percakapan Otomatis untuk menyesuaikan suara.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onAddLine}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tambah Baris Pertama</span>
            </button>
            <button
              type="button"
              onClick={onLoadStarter}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <span>Muat Contoh Lintas Generasi</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-200" data-testid="dialogue-list">
          {lines.map((line, index) => {
            const persona = VOICE_PERSONA_MAP[line.voiceId];
            const isPlayingThis = activePlayingLineId === line.id;
            const isLoadingThis = synthesizingLineId === line.id;
            const segment = segmentsByLineId[line.id];

            return (
              <div
                key={line.id}
                data-testid="dialogue-row"
                className={`px-5 py-3.5 transition-colors ${
                  isPlayingThis ? 'bg-teal-50/60' : 'bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-tabular text-xs font-semibold text-slate-500">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <label className="sr-only" htmlFor={`voice-select-${line.id}`}>
                      Pilih karakter suara baris {index + 1}
                    </label>
                    <select
                      id={`voice-select-${line.id}`}
                      value={line.voiceId}
                      onChange={(e) => {
                        const nextVoiceId = e.target.value as VoicePersonaId;
                        const nextPersona = VOICE_PERSONA_MAP[nextVoiceId];
                        onUpdateLine(line.id, {
                          voiceId: nextVoiceId,
                          speakerName: nextPersona.defaultSpeakerName,
                        });
                      }}
                      className="h-[34px] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    >
                      {VOICE_PERSONAS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>

                    <label className="sr-only" htmlFor={`speaker-name-${line.id}`}>
                      Nama pembicara baris {index + 1}
                    </label>
                    <input
                      id={`speaker-name-${line.id}`}
                      type="text"
                      value={line.speakerName}
                      onChange={(e) => onUpdateLine(line.id, { speakerName: e.target.value })}
                      placeholder="Nama"
                      className="h-[34px] w-28 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                    />

                    {line.styleOverride && (
                      <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={line.styleOverride}>
                        Gaya: {line.styleOverride}
                      </span>
                    )}

                    {segment && (
                      <span className="font-mono-tabular text-[11px] text-slate-500">
                        {segment.durationSec.toFixed(1)}s
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPreviewLine(line)}
                      disabled={isLoadingThis || !line.text.trim()}
                      aria-label={`Dengar baris ${index + 1} (${line.speakerName})`}
                      className="inline-flex h-[34px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    >
                      {isLoadingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : isPlayingThis ? (
                        <Square className="h-3.5 w-3.5 fill-current text-teal-700" aria-hidden="true" />
                      ) : (
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{isPlayingThis ? 'Stop' : 'Dengar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveLine(index, -1)}
                      disabled={index === 0}
                      aria-label={`Pindahkan baris ${index + 1} ke atas`}
                      className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    >
                      <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onMoveLine(index, 1)}
                      disabled={index === lines.length - 1}
                      aria-label={`Pindahkan baris ${index + 1} ke bawah`}
                      className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    >
                      <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteLine(line.id)}
                      aria-label={`Hapus baris ${index + 1}`}
                      className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5">
                  <label className="sr-only" htmlFor={`line-text-${line.id}`}>
                    Teks dialog baris {index + 1}
                  </label>
                  <textarea
                    id={`line-text-${line.id}`}
                    value={line.text}
                    onChange={(e) => onUpdateLine(line.id, { text: e.target.value })}
                    rows={2}
                    placeholder={`Tulis dialog untuk ${persona.label}...`}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-500">Ekspresi:</span>
                    {EXPRESSION_CUES.map((cue) => (
                      <button
                        key={cue.token}
                        type="button"
                        title={cue.hint}
                        onClick={() =>
                          onUpdateLine(line.id, {
                            text: insertExpressionCue(line.text, cue.token),
                          })
                        }
                        className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                      >
                        + {cue.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
