export type VoicePersonaId =
  | 'laki-muda'
  | 'laki-bapak'
  | 'laki-aki'
  | 'perempuan-muda'
  | 'perempuan-ibu'
  | 'perempuan-nenek';

export type PrebuiltVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface VoicePersona {
  id: VoicePersonaId;
  label: string;
  shortLabel: string;
  gender: 'Laki-laki' | 'Perempuan';
  ageGroup: 'Pemuda Gen-Z' | 'Dewasa' | 'Lansia';
  defaultSpeakerName: string;
  prebuiltVoice: PrebuiltVoiceName;
  speechStyle: string;
  description: string;
  sampleText: string;
  accentColor: string;
}

export interface DialogueLine {
  id: string;
  voiceId: VoicePersonaId;
  speakerName: string;
  text: string;
  styleOverride?: string;
}

export interface ConversationPreset {
  id: string;
  title: string;
  vibe: ConversationVibe;
  topic: string;
  participants: VoicePersonaId[];
  lines: Array<{
    voiceId: VoicePersonaId;
    speakerName: string;
    text: string;
  }>;
}

export type ConversationVibe =
  | 'gen-z-gaul'
  | 'lintas-generasi'
  | 'komedi-keluarga'
  | 'santai-warung';

export interface SynthesizedSegment {
  lineId: string;
  voiceId: VoicePersonaId;
  speakerName: string;
  audioBase64: string;
  startSec: number;
  durationSec: number;
}
