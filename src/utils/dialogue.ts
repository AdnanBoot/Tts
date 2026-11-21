import { DialogueLine, VoicePersonaId } from '../types/tts';
import { VOICE_PERSONA_MAP } from '../data/voices';

export interface ScriptStats {
  lineCount: number;
  wordCount: number;
  speakerCount: number;
  estimatedSeconds: number;
}

export interface VoiceGuideEntry {
  voiceId?: VoicePersonaId;
  style: string;
}

export interface ScreenplayEpisode {
  id: string;
  title: string;
  lines: DialogueLine[];
}

export interface ParsedScreenplay {
  episodes: ScreenplayEpisode[];
  voiceGuide: Record<string, VoiceGuideEntry>;
  skippedTextCards: number;
}

const PERSONA_KEYWORDS: Array<{ voiceId: VoicePersonaId; patterns: RegExp[] }> = [
  {
    voiceId: 'laki-aki',
    patterns: [
      /\b(aki|kakek|eyang\s*kakung|opa|mbah\s*kakung|kong|datuk|ki\s*jaga|tetua|sesepuh|pria\s*tua)\b/i,
    ],
  },
  {
    voiceId: 'perempuan-nenek',
    patterns: [/\b(nenek|oma|eyang\s*putri|mbah\s*putri|mak\s*tua|nyai|wanita\s*tua)\b/i],
  },
  {
    voiceId: 'laki-bapak',
    patterns: [/\b(bapak|pak|ayah|papa|abi|om|paman|narator|narrator|lemba|pria\s*dewasa)\b/i],
  },
  {
    voiceId: 'perempuan-ibu',
    patterns: [/\b(ibu|bu|mama|mamah|bunda|umi|tante|bibi|uni|wanita\s*dewasa)\b/i],
  },
  {
    voiceId: 'perempuan-muda',
    patterns: [
      /\b(nadia|nara|sinta|putri|ayu|dina|cewek|pemudi|mbak|sis|bestie|neng|adek\s*cewek|gadis|wanita\s*muda)\b/i,
    ],
  },
  {
    voiceId: 'laki-muda',
    patterns: [
      /\b(raka|arga|rafi|ilham|tandi|jalu|dimas|bima|andi|aldi|cowok|pemuda|bro|bang|mas|ngab|cuy|gan|pria\s*muda)\b/i,
    ],
  },
];

const EPISODE_HEADER_RE = /^EPISODE\s+\d+\b.*$/i;
const VOICE_GUIDE_HEADER_RE = /^PANDUAN\s+SUARA\b.*$/i;
const SCRIPT_META_RE =
  /^(NASKAH\s+PERCAKAPAN|MISTERI\s+PAMALI|Durasi\s+target|Season\s+\d+|Tokoh\s+lokal\s*:)/i;
const TIMECODE_PREFIX_RE = /^(?:\[?\d{1,2}[:.]?\d{0,2}\s*[–—-]\s*\d{1,2}[:.]?\d{0,2}\]?|\[\d{1,2}:\d{2}\])\s+/;

/**
 * Strips leading screenplay timecodes such as "00–07 " or "07-17 ".
 */
export function stripTimecodePrefix(line: string): string {
  return line.replace(TIMECODE_PREFIX_RE, '').trim();
}

/**
 * Heuristically infers the closest Indonesian voice persona from a speaker label and line/guide text.
 */
export function inferPersonaFromSpeaker(
  speakerLabel: string,
  lineText = '',
  fallbackIndex = 0,
): VoicePersonaId {
  const combined = `${speakerLabel} ${lineText}`;

  for (const rule of PERSONA_KEYWORDS) {
    if (rule.patterns.some((pattern) => pattern.test(speakerLabel))) {
      return rule.voiceId;
    }
  }

  for (const rule of PERSONA_KEYWORDS) {
    if (rule.patterns.some((pattern) => pattern.test(combined))) {
      return rule.voiceId;
    }
  }

  const rotation: VoicePersonaId[] = [
    'laki-muda',
    'perempuan-muda',
    'laki-bapak',
    'perempuan-ibu',
    'laki-aki',
    'perempuan-nenek',
  ];
  return rotation[fallbackIndex % rotation.length];
}

function inferPersonaFromGuideDescription(description: string): VoicePersonaId | undefined {
  if (/pria\s*tua|kakek|aki|lansia/i.test(description)) return 'laki-aki';
  if (/wanita\s*tua|nenek/i.test(description)) return 'perempuan-nenek';
  if (/pria\s*muda|pemuda/i.test(description)) return 'laki-muda';
  if (/wanita\s*muda|pemudi/i.test(description)) return 'perempuan-muda';
  if (/ibu|wanita\s*dewasa/i.test(description)) return 'perempuan-ibu';
  if (/bapak|pria\s*dewasa|dewasa/i.test(description)) return 'laki-bapak';
  return undefined;
}

/**
 * Parses a screenplay or raw conversation text into episode blocks, extracting PANDUAN SUARA
 * voice style cues and cleaning timecodes, metadata headers, and optional TEKS screen cards.
 */
export function parseScreenplay(
  rawText: string,
  options: { includeTextCards?: boolean } = {},
): ParsedScreenplay {
  const includeTextCards = options.includeTextCards ?? false;
  const rawLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawLines.length === 0) {
    return { episodes: [], voiceGuide: {}, skippedTextCards: 0 };
  }

  // First pass: extract PANDUAN SUARA entries
  const voiceGuide: Record<string, VoiceGuideEntry> = {};
  let inVoiceGuide = false;
  const contentLines: string[] = [];

  for (const rawLine of rawLines) {
    if (VOICE_GUIDE_HEADER_RE.test(rawLine)) {
      inVoiceGuide = true;
      continue;
    }
    if (EPISODE_HEADER_RE.test(rawLine)) {
      inVoiceGuide = false;
      contentLines.push(rawLine);
      continue;
    }

    if (inVoiceGuide) {
      const guideMatch = rawLine.match(/^([^:]{1,32}):\s*(.+)$/);
      if (guideMatch) {
        const speakerKey = guideMatch[1].trim().toLowerCase();
        const styleDesc = guideMatch[2].trim();
        if (speakerKey !== 'tokoh lokal') {
          voiceGuide[speakerKey] = {
            voiceId: inferPersonaFromGuideDescription(styleDesc),
            style: styleDesc,
          };
        }
      }
      continue;
    }

    contentLines.push(rawLine);
  }

  // Second pass: split into episodes and parse dialogue lines
  const episodes: ScreenplayEpisode[] = [];
  let currentEpisode: ScreenplayEpisode | null = null;
  const speakerMemory = new Map<string, VoicePersonaId>();
  let skippedTextCards = 0;
  let globalLineIdx = 0;

  const ensureEpisode = (title: string): ScreenplayEpisode => {
    if (!currentEpisode) {
      currentEpisode = {
        id: `ep-${episodes.length + 1}`,
        title,
        lines: [],
      };
      episodes.push(currentEpisode);
    }
    return currentEpisode;
  };

  for (const rawLine of contentLines) {
    if (EPISODE_HEADER_RE.test(rawLine)) {
      currentEpisode = {
        id: `ep-${episodes.length + 1}`,
        title: rawLine.trim(),
        lines: [],
      };
      episodes.push(currentEpisode);
      continue;
    }

    if (SCRIPT_META_RE.test(rawLine)) {
      continue;
    }

    const cleaned = stripTimecodePrefix(rawLine);
    if (!cleaned) {
      continue;
    }

    const colonMatch = cleaned.match(/^([^:]{1,32}):\s*(.+)$/);
    const dashMatch = !colonMatch ? cleaned.match(/^([A-Za-z0-9\s._-]{1,28})\s+-\s+(.+)$/) : null;
    const match = colonMatch || dashMatch;

    if (!match && episodes.length === 0 && !cleaned.includes(' ')) {
      continue;
    }

    let speakerName: string;
    let dialogueText: string;

    if (match) {
      speakerName = match[1].trim();
      dialogueText = match[2].trim();

      if (speakerName.toUpperCase() === 'TEKS') {
        if (!includeTextCards) {
          skippedTextCards += 1;
          continue;
        }
        speakerName = 'Narator';
      }
    } else {
      // Skip standalone title lines before any speaker appears when episodes exist
      if (currentEpisode && currentEpisode.lines.length === 0 && /^[A-Z0-9\s—–-]+$/.test(cleaned)) {
        continue;
      }
      speakerName = globalLineIdx % 2 === 0 ? 'Raka' : 'Nadia';
      dialogueText = cleaned;
    }

    const memoryKey = speakerName.toLowerCase();
    const guideEntry = voiceGuide[memoryKey];
    let voiceId = speakerMemory.get(memoryKey) ?? guideEntry?.voiceId;

    if (!voiceId) {
      voiceId = inferPersonaFromSpeaker(speakerName, dialogueText, speakerMemory.size);
    }
    speakerMemory.set(memoryKey, voiceId);

    const persona = VOICE_PERSONA_MAP[voiceId];
    const targetEpisode = ensureEpisode('Percakapan Utama');
    globalLineIdx += 1;

    targetEpisode.lines.push({
      id: `line-${Date.now()}-${globalLineIdx}`,
      voiceId,
      speakerName: speakerName || persona.defaultSpeakerName,
      text: dialogueText,
      styleOverride: guideEntry?.style,
    });
  }

  return {
    episodes: episodes.filter((ep) => ep.lines.length > 0),
    voiceGuide,
    skippedTextCards,
  };
}

/**
 * Parses raw conversation text into structured DialogueLine items.
 * Automatically handles timecodes, episode headers, and PANDUAN SUARA notes.
 */
export function parseRawConversation(
  rawText: string,
  options: { episodeIndex?: number; includeTextCards?: boolean } = {},
): DialogueLine[] {
  const parsed = parseScreenplay(rawText, { includeTextCards: options.includeTextCards });
  if (parsed.episodes.length === 0) {
    return [];
  }
  if (typeof options.episodeIndex === 'number') {
    return parsed.episodes[options.episodeIndex]?.lines ?? [];
  }
  return parsed.episodes.flatMap((ep) => ep.lines);
}

/**
 * Inserts a vocal cue token (<laugh>, |iya|, etc.) cleanly at the end.
 */
export function insertExpressionCue(currentText: string, cueToken: string): string {
  const trimmed = currentText.trim();
  if (!trimmed) {
    return cueToken;
  }
  return `${trimmed} ${cueToken}`.replace(/\s{2,}/g, ' ');
}

/**
 * Computes dialogue metrics (line count, word count, active speakers, estimated seconds).
 */
export function estimateScriptStats(lines: DialogueLine[]): ScriptStats {
  const nonEmptyLines = lines.filter((l) => l.text.trim().length > 0);
  const wordCount = nonEmptyLines.reduce((sum, line) => {
    const words = line.text
      .replace(/<[^>]+>/g, '')
      .replace(/\|/g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    return sum + words.length;
  }, 0);

  const uniqueSpeakers = new Set(nonEmptyLines.map((l) => l.voiceId));
  const estimatedSeconds =
    nonEmptyLines.length === 0
      ? 0
      : Math.max(1, Math.round(wordCount / 2.4 + (nonEmptyLines.length - 1) * 0.3));

  return {
    lineCount: lines.length,
    wordCount,
    speakerCount: uniqueSpeakers.size,
    estimatedSeconds,
  };
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '00:00';
  }
  const rounded = Math.round(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
