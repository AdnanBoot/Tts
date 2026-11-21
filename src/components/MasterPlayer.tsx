import { Download, Loader2, Pause, Play, Volume2 } from 'lucide-react';
import { formatDuration } from '../utils/dialogue';

interface MasterPlayerProps {
  hasMasterAudio: boolean;
  isSynthesizing: boolean;
  isPlayingMaster: boolean;
  currentTimeSec: number;
  totalDurationSec: number;
  pauseMs: number;
  playbackRate: number;
  hasLines: boolean;
  needsResync: boolean;
  onPauseMsChange: (ms: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onTogglePlayMaster: () => void;
  onSeekMaster: (timeSec: number) => void;
  onSynthesizeAll: () => void;
  onDownloadWav: () => void;
}

export function MasterPlayer({
  hasMasterAudio,
  isSynthesizing,
  isPlayingMaster,
  currentTimeSec,
  totalDurationSec,
  pauseMs,
  playbackRate,
  hasLines,
  needsResync,
  onPauseMsChange,
  onPlaybackRateChange,
  onTogglePlayMaster,
  onSeekMaster,
  onSynthesizeAll,
  onDownloadWav,
}: MasterPlayerProps) {
  const progressPercent =
    totalDurationSec > 0 ? Math.min(100, (currentTimeSec / totalDurationSec) * 100) : 0;

  return (
    <section
      id="pemutar-audio"
      aria-labelledby="player-heading"
      className="rounded-xl border border-slate-200 bg-white p-5 scroll-mt-20"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="player-heading" className="font-display text-base font-bold text-slate-900">
            03. Pemutar & Ekspor Percakapan Lengkap
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {hasMasterAudio
              ? needsResync
                ? 'Skrip diubah setelah sintesis terakhir. Klik Perbarui Audio untuk menyelaraskan.'
                : 'Audio percakapan lengkap siap diputar dan diunduh dalam format WAV.'
              : 'Klik Hasilkan Suara untuk menggabungkan seluruh karakter menjadi satu audio percakapan.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <label htmlFor="pause-gap-select" className="text-xs font-medium text-slate-600">
              Jeda Antar Pembicara
            </label>
            <select
              id="pause-gap-select"
              value={pauseMs}
              onChange={(e) => onPauseMsChange(Number(e.target.value))}
              className="h-[34px] rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 tabular-nums focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            >
              <option value={150}>150 ms</option>
              <option value={280}>280 ms</option>
              <option value={500}>500 ms</option>
              <option value={800}>800 ms</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="playback-rate-select" className="text-xs font-medium text-slate-600">
              Kecepatan
            </label>
            <select
              id="playback-rate-select"
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
              className="h-[34px] rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-800 tabular-nums focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/20"
            >
              <option value={0.9}>0.9x</option>
              <option value={1}>1.0x</option>
              <option value={1.1}>1.1x</option>
              <option value={1.25}>1.25x</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-slate-100/80 p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={hasMasterAudio ? onTogglePlayMaster : onSynthesizeAll}
            disabled={isSynthesizing || !hasLines}
            aria-label={
              hasMasterAudio
                ? isPlayingMaster
                  ? 'Jeda audio percakapan'
                  : 'Putar audio percakapan lengkap'
                : 'Hasilkan audio percakapan lengkap'
            }
            className="inline-flex h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Mensintesis...</span>
              </>
            ) : hasMasterAudio ? (
              isPlayingMaster ? (
                <>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  <span>Jeda</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>Putar Semua</span>
                </>
              )
            ) : (
              <>
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Hasilkan Suara</span>
              </>
            )}
          </button>

          {hasMasterAudio && needsResync && (
            <button
              type="button"
              onClick={onSynthesizeAll}
              disabled={isSynthesizing || !hasLines}
              className="inline-flex h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            >
              <span>Perbarui Audio</span>
            </button>
          )}
        </div>

        <div className="flex flex-1 items-center gap-3">
          <span className="font-mono-tabular w-12 text-right text-xs font-medium text-slate-700">
            {formatDuration(currentTimeSec)}
          </span>
          <div className="relative flex-1">
            <label htmlFor="master-audio-scrubber" className="sr-only">
              Posisi pemutaran audio percakapan
            </label>
            <input
              id="master-audio-scrubber"
              type="range"
              min={0}
              max={totalDurationSec > 0 ? totalDurationSec : 1}
              step={0.05}
              value={currentTimeSec}
              disabled={!hasMasterAudio}
              onChange={(e) => onSeekMaster(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, #0f766e ${progressPercent}%, #cbd5e1 ${progressPercent}%)`,
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <span className="font-mono-tabular w-12 text-xs font-medium text-slate-500">
            {formatDuration(totalDurationSec)}
          </span>
        </div>

        <button
          type="button"
          onClick={onDownloadWav}
          disabled={!hasMasterAudio}
          className="inline-flex h-[40px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Unduh WAV</span>
        </button>
      </div>
    </section>
  );
}
