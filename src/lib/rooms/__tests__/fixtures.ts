import type { Question } from "@/lib/ai/prompts";

/** Test-only sample questions. Never used at runtime. */
export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    questionOrder: 1,
    question:
      "Manakah langkah awal yang paling tepat sebelum merumuskan hipotesis dalam sebuah penyelidikan ilmiah?",
    options: [
      {
        label: "A",
        text: "Mengamati fenomena dan merumuskan pertanyaan masalah",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Pengamatan terarah dan rumusan masalah yang jelas menjadi landasan utama penyusunan hipotesis teruji.",
      },
      {
        label: "B",
        text: "Menarik kesimpulan akhir secara langsung tanpa pengujian",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Kesimpulan hanya dapat ditarik setelah pengumpulan data dan analisis bukti selesai dilakukan.",
      },
      {
        label: "C",
        text: "Mempublikasikan hipotesis tanpa verifikasi eksperimen",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Publikasi ilmiah menuntut prosedur verifikasi, telaah sejawat, dan replikasi metodologis.",
      },
      {
        label: "D",
        text: "Mengubah data mentah agar sesuai dengan ekspektasi awal",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Manipulasi data melanggar integritas ilmiah dan menghasilkan kesimpulan yang tidak valid.",
      },
    ],
    correctAnswer: "A",
    explanation:
      "Metode ilmiah selalu diawali dengan observasi sistematis untuk mengidentifikasi variabel dan merumuskan masalah sebelum menyusun dugaan sementara (hipotesis).",
    conceptTag: "Metode Ilmiah: Observasi & Rumusan Masalah",
    culturalContext: "Prinsip Berpikir Kritis & Riset Terstruktur",
  },
  {
    id: "a2222222-2222-2222-2222-222222222222",
    questionOrder: 2,
    question:
      "Jika grafik kecepatan terhadap waktu (v-t) menunjukkan garis lurus horizontal di atas sumbu waktu, apa karakteristik gerak benda tersebut?",
    options: [
      {
        label: "A",
        text: "Benda berada dalam kondisi diam total tanpa perpindahan",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Benda diam diwakili oleh garis pada v = 0 atau garis horizontal pada grafik posisi (s-t).",
      },
      {
        label: "B",
        text: "Benda bergerak dengan kecepatan konstan (percepatan nol)",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Garis horizontal pada kurva v-t menandakan nilai kecepatan tetap seiring bertambahnya waktu.",
      },
      {
        label: "C",
        text: "Kecepatan benda bertambah secara eksponensial seiring waktu",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Kecepatan bertambah menghasilkan garis miring ke atas (gradien positif).",
      },
      {
        label: "D",
        text: "Benda mengalami perlambatan konstan menuju berhenti",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Perlambatan ditandai dengan gradien miring ke bawah menuju nilai nol.",
      },
    ],
    correctAnswer: "B",
    explanation:
      "Pada grafik kecepatan terhadap waktu, kemiringan (gradien) menyatakan percepatan. Garis datar horizontal memiliki gradien nol, sehingga percepatan a = 0 (Gerak Lurus Beraturan).",
    conceptTag: "Kinematika: Interpretasi Grafik Gerak",
    culturalContext: "Literasi Numerasi & Analisis Data",
  },
  {
    id: "a3333333-3333-3333-3333-333333333333",
    questionOrder: 3,
    question:
      "Dalam jejaring ekosistem, jika populasi herbivora mengalami penurunan drastis secara tiba-tiba, dampak jangka pendek yang paling logis adalah...",
    options: [
      {
        label: "A",
        text: "Seluruh tingkatan trofik langsung musnah tanpa adaptasi",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Ekosistem memiliki mekanisme penyangga dinamis, kepunahan masal seketika tidak terjadi.",
      },
      {
        label: "B",
        text: "Energi matahari berhenti masuk ke sistem fotosintesis",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Energi matahari merupakan faktor abiotik independen dari populasi trofik.",
      },
      {
        label: "C",
        text: "Biomassa produsen cenderung meningkat dan karnivora primer mengalami defisit pangan",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Berkurangnya pemangsa produsen memberi ruang vegetasi pulih, sementara predator di atasnya kehilangan mangsa utama.",
      },
      {
        label: "D",
        text: "Pengurai (dekomposer) berhenti mendaur ulang zat hara tanah",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Dekomposer tetap mengurai sisa organik dari tumbuhan maupun bangkai hewan yang mati.",
      },
    ],
    correctAnswer: "C",
    explanation:
      "Herbivora berfungsi sebagai jembatan transfer energi dari produsen ke karnivora. Penurunan populasi ini menekan predator sekunder sekaligus mengurangi laju konsumsi tumbuhan.",
    conceptTag: "Ekologi: Dinamika Rantai Makanan & Trofik",
    culturalContext: "Keseimbangan Ekosistem & Biosfer",
  },
  {
    id: "a4444444-4444-4444-4444-444444444444",
    questionOrder: 4,
    question:
      "Ketika mengevaluasi keabsahan data digital atau artikel informasi, langkah verifikasi primer yang paling dianjurkan adalah...",
    options: [
      {
        label: "A",
        text: "Menyimpulkan validitas hanya dari banyaknya jumlah suka (likes) di media sosial",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Metrik popularitas algoritma media sosial tidak berkorelasi dengan akurasi fakta faktual.",
      },
      {
        label: "B",
        text: "Membaca tajuk utama sensasional tanpa meninjau isi tubuh teks",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Judul sensasional (clickbait) sering kali melebih-lebihkan atau tidak mencerminkan data isi.",
      },
      {
        label: "C",
        text: "Menerima informasi tanpa ragu jika ditulis dengan tata bahasa formal",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Format formal dapat disimulasikan dan tidak menjamin ketiadaan misinformasi.",
      },
      {
        label: "D",
        text: "Melakukan uji silang rujukan primer dan memverifikasi metodologi sumber",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Penelusuran dokumen orisinal dan reputasi penerbit primer mencegah distorsi informasi sekunder.",
      },
    ],
    correctAnswer: "D",
    explanation:
      "Literasi informasi kritis menuntut pengecekan bukti primer, identifikasi bias penulis, dan verifikasi silang independen.",
    conceptTag: "Literasi Digital: Verifikasi Fakta & Bukti",
    culturalContext: "Evaluasi Kritis Informasi Digital",
  },
  {
    id: "a5555555-5555-5555-5555-555555555555",
    questionOrder: 5,
    question:
      "Dalam diskusi kolaboratif pemecahan masalah kelas, tindakan yang paling mencerminkan komunikasi ilmiah efektif adalah...",
    options: [
      {
        label: "A",
        text: "Mempertahankan opini pribadi dengan menolak seluruh koreksi data dari teman",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Sikap defensif menutup peluang identifikasi kekeliruan konsep dan perbaikan solusi.",
      },
      {
        label: "B",
        text: "Mendengarkan aktif perspektif kelompok dan menguji setiap argumen berdasarkan data objektif",
        isCorrect: true,
        distractorRationale:
          "Kunci benar: Kolaborasi ilmiah bertumpu pada pertukaran ide terbuka yang divalidasi oleh bukti terukur.",
      },
      {
        label: "C",
        text: "Menyerahkan seluruh keputusan tanpa memberikan kontribusi penalaran",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Sikap pasif menghambat sinergi pemecahan masalah multidimensi dalam kelompok.",
      },
      {
        label: "D",
        text: "Mengabaikan fakta jika bertentangan dengan asumsi awal mayoritas",
        isCorrect: false,
        distractorRationale:
          "Pengecoh: Konsensus tanpa dukungan bukti empiris merupakan bias kelompok (groupthink).",
      },
    ],
    correctAnswer: "B",
    explanation:
      "Komunikasi ilmiah yang sehat mengintegrasikan empati dialogis dengan ketatnya uji silang penalaran berbasis data.",
    conceptTag: "Kolaborasi & Berpikir Kritis: Konsensus Ilmiah",
    culturalContext: "Etika Diskusi & Pembelajaran Kolaboratif",
  },
];

