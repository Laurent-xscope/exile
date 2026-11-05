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
    line1: "Siswa bisa hafal kata Bali,",
    line2: "tapi tahu kapan memakainya?",
    caption: "Basa Bali punya tingkatan. Salah tingkat, salah makna.",
  },
  problem: {
    title: "Nilai keluar setelah ulangan selesai.",
    question: "Tapi kenapa siswa keliru?",
    worksheetTitle: "Ulangan Harian · Basa Bali",
    caption: "Guru hanya melihat skor, bukan alasan di balik jawaban yang salah.",
  },
  solution: {
    windowTitle: "exile.web.id / Studio",
    moduleLabel: "Modul teks",
    moduleHeading: "Anggah-ungguhing Basa Bali",
    moduleBody:
      "Tingkatan berbahasa menurut siapa yang berbicara dan siapa yang diajak bicara: alus singgih, alus sor, alus mider, andap, dan kasar.",
    paste: "Tempel modul",
    generate: "Buat materi",
    outputs: {
      summary: "Ringkasan & Glosarium",
      cards: "Kartu Belajar 3D",
      quiz: "Bank Soal Kuis",
    },
    glossary: [
      ["Alus singgih", "menghormati lawan bicara"],
      ["Alus sor", "merendahkan diri sendiri"],
    ],
    cardFront: "Titiang",
    cardBack: "Saya (alus sor)",
    quizQuestion: "Kata “saya” yang tepat untuk berbicara dengan guru?",
    quizOptions: ["Tiang", "Titiang", "Ida", "Cang"],
    caption: "Satu modul ditempel, tiga materi belajar siap pakai.",
  },
  classroom: {
    steps: ["Tampilkan PIN", "Siswa bergabung", "Kuis berjalan", "Laporan kelas"],
    captions: [
      "Guru menampilkan PIN di proyektor.",
      "Siswa masuk lewat HP, tanpa akun.",
      "Jawaban salah langsung dapat penjelasan singkat yang ramah.",
      "Guru melihat peta miskonsepsi kelas saat itu juga.",
    ],
    joinHint: "Gabung di",
    pinLabel: "PIN KUIS",
    students: ["Ayu", "Komang", "Wayan", "Putu", "Made", "Gus Adi", "Luh Sari", "Nyoman"],
    question: "Kata “saya” yang tepat untuk berbicara dengan guru?",
    options: ["Tiang", "Titiang", "Ida", "Cang"],
    correctIndex: 1,
    pickedIndex: 2,
    feedbackTitle: "Belum tepat!",
    feedbackBody:
      "“Ida” itu alus singgih, untuk menghormati orang lain. Untuk dirimu sendiri pakai alus sor: titiang.",
    reportTitle: "Laporan miskonsepsi",
    reportRows: [
      ["Alus singgih vs alus sor", 62],
      ["Kata ganti orang", 41],
      ["Alus mider", 24],
    ] as [string, number][],
    sample: "contoh data",
  },
  differentiator: {
    title: "Konsep yang paling sering keliru",
    sample: "contoh data",
    rows: [
      { label: "Alus singgih vs alus sor", value: 68, highlight: true },
      { label: "Kata ganti (tiang, titiang, ida)", value: 57 },
      { label: "Alus mider", value: 41 },
      { label: "Kruna andap & kasar", value: 28 },
    ],
    adviceTag: "Saran ajar ulang",
    adviceTitle: "Ulang konsep alus singgih vs alus sor",
    adviceBody: "Mulai dari 3 kalimat contoh, lalu 3 soal remedial untuk tiap siswa yang keliru.",
    caption: "Bukan cuma skor: exile.web.id menunjukkan konsep mana yang perlu diulang.",
  },
  cta: {
    brand: "exile.web.id",
  },
} as const;
