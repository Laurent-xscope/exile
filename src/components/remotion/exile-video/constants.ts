import { z } from "zod";
import { zColor } from "@remotion/zod-types";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Overlap between two neighbouring scenes (frames). */
export const TRANSITION = 15;

/**
 * Visible length of each scene on the timeline (frames).
 * Every scene except the last one is extended by TRANSITION so the overlap
 * does not eat into the next scene. The sum is exactly 1800 frames (60s).
 */
export const SCENE_FRAMES = {
  hook: 150, //       0-5s
  problem: 270, //    5-14s
  solution: 300, //   14-24s
  classroom: 480, //  24-40s
  differentiator: 360, // 40-52s
  cta: 240, //        52-60s
} as const;

export const TOTAL_FRAMES = Object.values(SCENE_FRAMES).reduce((a, b) => a + b, 0);

/** Background music slot. Put a file in /public and set e.g. "/music/theme.mp3". */
export const MUSIC_SRC: string | null = null;
export const MUSIC_VOLUME = 0.35;

export const exileVideoSchema = z.object({
  tagline: z.string(),
  pin: z.string(),
  url: z.string(),
  teal: zColor(),
  gold: zColor(),
  cream: zColor(),
});

export type ExileVideoProps = z.infer<typeof exileVideoSchema>;

export const DEFAULT_PROPS: ExileVideoProps = {
  tagline: "Evaluasi yang tahu kenapa siswa keliru",
  pin: "482915",
  url: "exile.web.id",
  teal: "#0A0A0A",
  gold: "#EF4444",
  cream: "#FAFAFA",
};

/** All on-screen copy lives here (Indonesian). */
export const COPY = {
  hook: {
    line1: "Siswa bisa hafal bagian sel,",
    line2: "tapi tahu fungsi di tubuh?",
    caption: "Organel sel punya peran unik. Salah paham, gagal analisis.",
  },
  problem: {
    title: "Nilai keluar setelah ulangan selesai.",
    question: "Tapi kenapa siswa keliru?",
    worksheetTitle: "Ulangan harian · biologi sel",
    caption: "Guru hanya melihat skor, bukan alasan di balik jawaban yang salah.",
  },
  solution: {
    windowTitle: "exile.web.id / Studio",
    moduleLabel: "Modul teks",
    moduleHeading: "Struktur sel & fungsi organel",
    moduleBody:
      "Organel sel bekerja terpadu menjalankan metabolisme: mitokondria memproduksi ATP, ribosom merakit protein, kloroplas fotosintesis.",
    paste: "Tempel modul",
    generate: "Buat materi",
    outputs: {
      summary: "Ringkasan & glosarium",
      cards: "Kartu belajar 3d",
      quiz: "Bank soal kuis",
    },
    glossary: [
      ["Mitokondria", "respirasi seluler & produksi ATP"],
      ["Ribosom", "sintesis polipeptida protein"],
    ],
    cardFront: "Mitokondria",
    cardBack: "Pabrik energi sel",
    quizQuestion: "Organel sel tempat respirasi pembentukan ATP adalah?",
    quizOptions: ["Ribosom", "Mitokondria", "Lisosom", "Vakuola"],
    caption: "Satu modul ditempel, tiga materi belajar siap pakai.",
  },
  classroom: {
    steps: ["Tampilkan pin", "Siswa bergabung", "Kuis berjalan", "Laporan kelas"],
    captions: [
      "Guru menampilkan pin di proyektor.",
      "Siswa masuk lewat HP, tanpa akun.",
      "Jawaban salah langsung dapat penjelasan singkat yang ramah.",
      "Guru melihat peta miskonsepsi kelas saat itu juga.",
    ],
    joinHint: "Gabung di",
    pinLabel: "Pin kuis",
    students: ["Ayu", "Rian", "Dewi", "Budi", "Siti", "Dimas", "Nadia", "Fajar"],
    question: "Organel sel tempat respirasi pembentukan ATP adalah?",
    options: ["Ribosom", "Mitokondria", "Lisosom", "Vakuola"],
    correctIndex: 1,
    pickedIndex: 2,
    feedbackTitle: "Belum tepat!",
    feedbackBody:
      "Lisosom mencerna limbah sel, bukan penghasil ATP. Organel tempat utama respirasi sel adalah mitokondria.",
    reportTitle: "Laporan miskonsepsi",
    reportRows: [
      ["Mitokondria vs lisosom", 62],
      ["Sintesis protein ribosom", 41],
      ["Transpor aktif membran", 24],
    ] as [string, number][],
    sample: "contoh data",
  },
  differentiator: {
    title: "Konsep yang paling sering keliru",
    sample: "contoh data",
    rows: [
      { label: "Mitokondria vs kloroplas", value: 68, highlight: true },
      { label: "Transpor pasif vs aktif membran", value: 57 },
      { label: "Sintesis protein pada ribosom", value: 41 },
      { label: "Fungsi lisosom serta vakuola", value: 28 },
    ],
    adviceTag: "Saran ajar ulang",
    adviceTitle: "Ulang konsep mitokondria vs kloroplas",
    adviceBody: "Mulai dari bagan alur respirasi, lalu 3 soal remedial untuk tiap siswa yang keliru.",
    caption: "Bukan cuma skor: exile.web.id menunjukkan konsep mana yang perlu diulang.",
  },
  cta: {
    brand: "exile.web.id",
  },
} as const;
