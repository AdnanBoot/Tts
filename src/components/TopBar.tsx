import { Volume2, Loader2 } from 'lucide-react';

interface TopBarProps {
  isSynthesizing: boolean;
  hasLines: boolean;
  onSynthesizeAll: () => void;
}

export function TopBar({ isSynthesizing, hasLines, onSynthesizeAll }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded"
        >
          SuaraKita
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#pemeran-suara"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded px-1 py-0.5"
          >
            Pemeran Suara
          </a>
          <a
            href="#generator-otomatis"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded px-1 py-0.5"
          >
            Generator Otomatis
          </a>
          <a
            href="#pemutar-audio"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded px-1 py-0.5"
          >
            Pemutar Audio
          </a>
          <a
            href="#editor-skrip"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded px-1 py-0.5"
          >
            Editor Skrip
          </a>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onSynthesizeAll}
            disabled={isSynthesizing || !hasLines}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            {isSynthesizing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Mensintesis...</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                <span>Hasilkan Suara</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
