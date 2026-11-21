import { ConversationPreset, VoicePersona, VoicePersonaId } from '../types/tts';

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'laki-muda',
    label: 'Laki-laki Muda',
    shortLabel: 'Pemuda Gen-Z',
    gender: 'Laki-laki',
    ageGroup: 'Pemuda Gen-Z',
    defaultSpeakerName: 'Raka',
    prebuiltVoice: 'Puck',
    speechStyle:
      'Pemuda Indonesia usia 21 tahun, suara laki-laki muda yang energik, santai, fasih berbahasa Indonesia gaya gaul Gen-Z Jakarta, intonasi ekspresif dan natural.',
    description: 'Fasih Indonesia gaya bahasa pemuda Gen-Z, santai, lincah, dan ekspresif.',
    sampleText:
      'Jujurly bro, konsep nongkrong kali ini valid parah sih! Gaspol aja kita cobain sekarang.',
    accentColor: '#2563EB',
  },
  {
    id: 'laki-bapak',
    label: 'Laki-laki Bapak',
    shortLabel: 'Bapak-bapak',
    gender: 'Laki-laki',
    ageGroup: 'Dewasa',
    defaultSpeakerName: 'Pak Hendra',
    prebuiltVoice: 'Charon',
    speechStyle:
      'Bapak-bapak Indonesia usia 48 tahun, suara pria dewasa yang berwibawa namun hangat dan ramah, berbicara bahasa Indonesia fasih dengan tempo mantap.',
    description: 'Berwibawa, hangat, dan kebapakan dengan intonasi Indonesia dewasa yang tenang.',
    sampleText:
      'Pelan-pelan saja kalau jalan, yang penting kerjaan beres dan hati tetap tenang.',
    accentColor: '#0F766E',
  },
  {
    id: 'laki-aki',
    label: 'Laki-laki Aki-aki Tua',
    shortLabel: 'Aki-aki / Kakek',
    gender: 'Laki-laki',
    ageGroup: 'Lansia',
    defaultSpeakerName: 'Aki Dadang',
    prebuiltVoice: 'Fenrir',
    speechStyle:
      'Aki-aki atau kakek tua Indonesia usia 76 tahun, suara pria lanjut usia yang serak lembut berkarakter, tempo pelan, bijak, dan hangat dalam bahasa Indonesia fasih.',
    description: 'Suara pria lansia sedikit serak, pelan, penuh wibawa dan kehangatan kakek.',
    sampleText:
      'Wah, anak muda zaman sekarang bahasanya cepat sekali ya... tapi Aki senang lihat kalian akur.',
    accentColor: '#B45309',
  },
  {
    id: 'perempuan-muda',
    label: 'Perempuan Muda',
    shortLabel: 'Pemudi Gen-Z',
    gender: 'Perempuan',
    ageGroup: 'Pemuda Gen-Z',
    defaultSpeakerName: 'Nadia',
    prebuiltVoice: 'Zephyr',
    speechStyle:
      'Pemudi Indonesia usia 20 tahun, suara perempuan muda yang cerah, lincah, fasih berbahasa Indonesia gaya Gen-Z Jakarta, intonasi relatable dan dinamis.',
    description: 'Ceria, ekspresif, dan fasih logat gaul Gen-Z perempuan Indonesia.',
    sampleText:
      'Sumpah ya bestie, vibes tempat ini tuh estetik banget! Literally wajib masuk story sih.',
    accentColor: '#E11D48',
  },
  {
    id: 'perempuan-ibu',
    label: 'Perempuan Ibu-ibu',
    shortLabel: 'Ibu-ibu',
    gender: 'Perempuan',
    ageGroup: 'Dewasa',
    defaultSpeakerName: 'Bu Sari',
    prebuiltVoice: 'Kore',
    speechStyle:
      'Ibu-ibu Indonesia usia 46 tahun, suara perempuan dewasa yang hangat, keibuan, ramah, fasih berbahasa Indonesia sehari-hari dengan artikulasi jelas.',
    description: 'Ramah, keibuan, dan ekspresif seperti percakapan ibu rumah tangga Indonesia.',
    sampleText:
      'Nak, jangan lupa makan siang dulu ya sebelum berangkat, Ibu sudah masak sayur asem.',
    accentColor: '#7C3AED',
  },
  {
    id: 'perempuan-nenek',
    label: 'Perempuan Nenek',
    shortLabel: 'Nenek-nenek',
    gender: 'Perempuan',
    ageGroup: 'Lansia',
    defaultSpeakerName: 'Nenek Murni',
    prebuiltVoice: 'Kore',
    speechStyle:
      'Nenek tua Indonesia usia 75 tahun, suara perempuan lanjut usia yang lembut, lirih, sedikit bergetar halus, tempo lambat dan penuh kasih sayang dalam bahasa Indonesia fasih.',
    description: 'Lembut, pelan, dan penuh kasih sayang khas nenek-nenek Indonesia.',
    sampleText:
      'Sini duduk dekat Nenek, Nak... cerita dong tadi di kampus ngapain saja sama temanmu.',
    accentColor: '#059669',
  },
];

export const VOICE_PERSONA_MAP: Record<VoicePersonaId, VoicePersona> = VOICE_PERSONAS.reduce(
  (acc, voice) => {
    acc[voice.id] = voice;
    return acc;
  },
  {} as Record<VoicePersonaId, VoicePersona>,
);

export const CONVERSATION_PRESETS: ConversationPreset[] = [
  {
    id: 'ngopi-lintas-generasi',
    title: 'Ngopi Bareng Lintas Generasi',
    vibe: 'lintas-generasi',
    topic: 'Cucu Gen-Z ngajak Bapak, Aki, Ibu, dan Nenek nyobain kopi kekinian',
    participants: [
      'laki-muda',
      'perempuan-muda',
      'laki-bapak',
      'perempuan-ibu',
      'laki-aki',
      'perempuan-nenek',
    ],
    lines: [
      {
        voiceId: 'laki-muda',
        speakerName: 'Raka',
        text: 'Guys, jujurly tempat ngopi ini tuh hidden gem banget sih. Vibes-nya dapet parah!',
      },
      {
        voiceId: 'perempuan-muda',
        speakerName: 'Nadia',
        text: 'Valid no debat, Rak! <laugh> Apalagi es kopi susu gula arennya, literally bikin melek seharian.',
      },
      {
        voiceId: 'laki-bapak',
        speakerName: 'Pak Hendra',
        text: 'Hmm, Bapak pesan kopi tubruk panas saja ya, Nak. Yang gulanya tidak terlalu manis.',
      },
      {
        voiceId: 'perempuan-ibu',
        speakerName: 'Bu Sari',
        text: 'Ibu juga ikut kopi hangat aja deh, sekalian pesan pisang goreng buat rame-rame.',
      },
      {
        voiceId: 'laki-aki',
        speakerName: 'Aki Dadang',
        text: '<breath> Pelan-pelan ngomongnya, Ki nggak ngerti tadi "hidden gem" itu artinya apa, cu?',
      },
      {
        voiceId: 'perempuan-nenek',
        speakerName: 'Nenek Murni',
        text: '|Iya| Aki juga sama kayak Nenek, bingung sama bahasa anak sekarang... yang penting kita kumpul bareng ya, Nak.',
      },
    ],
  },
  {
    id: 'spill-skincare-nenek',
    title: 'Spill Tren TikTok ke Nenek & Ibu',
    vibe: 'gen-z-gaul',
    topic: 'Pemudi Gen-Z cerita soal tren fomo belanja live ke Ibu dan Nenek',
    participants: ['perempuan-muda', 'perempuan-ibu', 'perempuan-nenek'],
    lines: [
      {
        voiceId: 'perempuan-muda',
        speakerName: 'Nadia',
        text: 'Bu, sumpah aku tuh lagi FOMO banget lihat orang spill skincare viral jam dua belas malam!',
      },
      {
        voiceId: 'perempuan-ibu',
        speakerName: 'Bu Sari',
        text: 'Aduh Nadia, jangan kalap checkout terus dong. Kemarin paket datang dua kardus belum dibuka.',
      },
      {
        voiceId: 'perempuan-nenek',
        speakerName: 'Nenek Murni',
        text: 'Zaman Nenek dulu mah pakainya bedak dingin sama air mawar saja sudah seger, Nak.',
      },
      {
        voiceId: 'perempuan-muda',
        speakerName: 'Nadia',
        text: '<laugh> Ih Nenek slay banget sih! Besok aku spill rahasia glowing Nenek di TikTok deh.',
      },
    ],
  },
  {
    id: 'nasihat-aki-bapak',
    title: 'Curhat Kerja Gen-Z ke Bapak & Aki',
    vibe: 'komedi-keluarga',
    topic: 'Pemuda Gen-Z curhat soal burnout kerja ke Bapak dan Aki di teras rumah',
    participants: ['laki-muda', 'laki-bapak', 'laki-aki'],
    lines: [
      {
        voiceId: 'laki-muda',
        speakerName: 'Raka',
        text: '<sigh> Jujurly capek banget Pak, revisi kerjaan numpuk, mental rasanya pengen healing ke pantai.',
      },
      {
        voiceId: 'laki-bapak',
        speakerName: 'Pak Hendra',
        text: 'Wajar capek, Rak. Tapi ingat, istirahat itu perlu, jangan cuma lihat layar HP terus pas malam.',
      },
      {
        voiceId: 'laki-aki',
        speakerName: 'Aki Dadang',
        text: 'Betul kata Bapakmu. Besok pagi ikut Aki ke kebun saja, hirup udara segar biar pikiranmu plong lagi.',
      },
      {
        voiceId: 'laki-muda',
        speakerName: 'Raka',
        text: '|Gas| Ki! Sekalian Raka bawa kamera buat bikin vlog bareng Aki, pasti seru.',
      },
    ],
  },
  {
    id: 'warung-gorengan',
    title: 'Debat Santai di Warung Gorengan',
    vibe: 'santai-warung',
    topic: 'Obrolan seru pemuda Gen-Z dan tetangga di warung gorengan sore hari',
    participants: ['laki-muda', 'perempuan-muda', 'perempuan-ibu', 'laki-bapak'],
    lines: [
      {
        voiceId: 'laki-muda',
        speakerName: 'Raka',
        text: 'Misi Bu, bakwan jagungnya masih anget nggak? Aku lagi pengen banget ngemil yang kriuk.',
      },
      {
        voiceId: 'perempuan-ibu',
        speakerName: 'Bu Sari',
        text: 'Baru banget diangkat dari penggorengan, Rak. Ini masih ngebul, ambil aja pakai penjepit.',
      },
      {
        voiceId: 'perempuan-muda',
        speakerName: 'Nadia',
        text: 'Eh bagi cabe rawitnya dong, makan gorengan tanpa cabe tuh kurang nampol vibes-nya!',
      },
      {
        voiceId: 'laki-bapak',
        speakerName: 'Pak Hendra',
        text: '<laugh> Kalian ini ada-ada saja. Bapak ikut bungkus tahu isi lima ya, Bu, buat orang rumah.',
      },
    ],
  },
];

export const EXPRESSION_CUES: Array<{ label: string; token: string; hint: string }> = [
  { label: 'Tertawa', token: '<laugh>', hint: 'Sisipkan tawa natural' },
  { label: 'Tarik Napas', token: '<breath>', hint: 'Sisipkan helaan napas' },
  { label: 'Menghela Napas', token: '<sigh>', hint: 'Sisipkan desahan lelah/lega' },
  { label: 'Respon Iya', token: '|iya|', hint: 'Backchanneling natural' },
  { label: 'Respon Hmm', token: '|hmm|', hint: 'Respon berpikir singkat' },
];
