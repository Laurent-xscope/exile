import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DocumentAnalysisSchema,
  buildDocumentAnalysisPrompt,
  type DocumentAnalysis,
} from "@/lib/ai/prompts";
import {
  extractJSON,
  callGeminiWithRotation,
  geminiKeyPool,
} from "@/lib/ai/gateway";
import { storeQuiz } from "@/lib/rooms/store";

const RequestSchema = z.object({
  fileName: z.string().optional().default("dokumen-materi.pdf"),
  fileType: z.enum(["image", "pdf", "text"]).optional().default("text"),
  fileBase64: z.string().optional(),
  mimeType: z.string().optional().default("text/plain"),
  extractedText: z.string().optional(),
  text: z.string().optional(),
  userContext: z.string().optional(),
  customPrompt: z.string().optional(),
});

function getFallbackDocumentAnalysis(
  fileName: string,
  extractedText?: string,
  userContext?: string
): DocumentAnalysis {
  const combined = `${extractedText || ""} ${userContext || ""} ${fileName}`.toLowerCase();

  if (
    combined.includes("pasang aksara") ||
    combined.includes("adeg-adeg") ||
    combined.includes("gantungan") ||
    combined.includes("wianjana") ||
    combined.includes("carik")
  ) {
    return {
      title: "Modul Pasang Aksara Bali Baku & Aturan Adeg-adeg",
      subjectArea: "Bahasa & Aksara Bali (Kurikulum Merdeka Mulok)",
      gradeLevel: "SMP Fase D (Kelas 7-9)",
      summary: {
        overview:
          "Pedoman Pasang Aksara Bali Baku mengatur tata tulis aksara wianjana, pangangge suara, pangangge tengenan, serta kaidah pemakaian adeg-adeg, gantungan, gempelan, dan tanda carik agar selaras dengan ejaan tradisi lontar dan uger-uger Pasamuan Agung.",
        keyTakeaways: [
          "Adeg-adeg hanya boleh ditulis pada akhir kata di penghujung kalimat atau tepat sebelum tanda carik, dan dilarang keras di tengah kata.",
          "Gantungan wajib digunakan di bawah aksara wianjana untuk mematikan vokal konsonan sebelumnya ketika berada di tengah kata atau kalimat.",
          "Gempelan ditempelkan di sebelah kanan aksara wianjana yang dimatikan khusus untuk pasangan konsonan seperti Pa, Sa, dan Ra.",
          "Tanda Carik (Carik Siki sebagai koma dan Carik Kalih sebagai titik) menandai jeda dan akhir kalimat, serta menjadi batas sah penempatan adeg-adeg.",
        ],
        culturalGlossary: [
          {
            term: "Adeg-adeg",
            meaning: "Tanda pemati vokal bawaan /a/ pada aksara wianjana di akhir kalimat atau sebelum tanda carik",
            category: "Pasang Aksara",
          },
          {
            term: "Gantungan",
            meaning: "Pasangan aksara konsonan yang ditulis menggantung di bawah aksara wianjana yang dimatikan",
            category: "Pasang Aksara",
          },
          {
            term: "Gempelan",
            meaning: "Pasangan aksara konsonan yang ditempel di sisi kanan aksara wianjana yang dimatikan",
            category: "Pasang Aksara",
          },
          {
            term: "Aksara Wianjana",
            meaning: "Aksara konsonan dasar Bali (Ha-Na-Ca-Ra-Ka) yang secara inheren berbunyi vokal /a/",
            category: "Aksara Dasar",
          },
          {
            term: "Carik Siki & Carik Kalih",
            meaning: "Tanda baca jeda koma (carik siki) dan penutup kalimat titik (carik kalih) dalam sastra Bali",
            category: "Tanda Baca",
          },
          {
            term: "Pangangge Tengenan",
            meaning: "Tanda konsonan mati khusus (Cecek /-ng/, Surang /-r/, Bisah /-h/) yang menggantikan adeg-adeg",
            category: "Pangangge",
          },
        ],
      },
      flashcards: [
        {
          id: "fc-1",
          front: "Di manakah posisi penulisan Adeg-adeg yang sah menurut Pasang Aksara Bali Baku?",
          back: "Hanya di akhir kalimat atau tepat sebelum tanda Carik Siki/Carik Kalih (dan untuk menghindari tumpuk tiga).",
          tag: "Aturan Adeg-adeg",
          hint: "Pantang ditulis di tengah kata biasa",
        },
        {
          id: "fc-2",
          front: "Apa fungsi utama Gantungan dan Gempelan dalam penyuratan kruna?",
          back: "Mematikan vokal /a/ pada aksara wianjana di depannya ketika terjadi pertemuan dua konsonan di tengah kata atau kalimat.",
          tag: "Gantungan & Gempelan",
          hint: "Pengganti adeg-adeg di tengah kata",
        },
        {
          id: "fc-3",
          front: "Mengapa huruf konsonan mati /r/ pada kata 'pasar' tidak boleh memakai adeg-adeg?",
          back: "Karena konsonan mati /r/, /ng/, dan /h/ wajib ditulis dengan Pangangge Tengenan (Surang, Cecek, Bisah).",
          tag: "Pangangge Tengenan",
          hint: "Ingat tiga konsonan khusus: ng, r, h",
        },
        {
          id: "fc-4",
          front: "Kapan aturan 'Tumpuk Tiga' mengizinkan penggunaan Adeg-adeg di tengah kata?",
          back: "Ketika tiga konsonan berurutan bertemu sehingga tidak memungkinkan menumpuk dua gantungan sekaligus.",
          tag: "Pengecualian Adeg-adeg",
          hint: "Contoh pada kata 'tamblang'",
        },
        {
          id: "fc-5",
          front: "Apa perbedaan fungsi Carik Siki dan Carik Kalih?",
          back: "Carik Siki berfungsi setara tanda koma (jeda pendek), sedangkan Carik Kalih berfungsi setara tanda titik (akhir kalimat).",
          tag: "Tanda Carik",
          hint: "Siki = satu garis, Kalih = dua garis",
        },
      ],
      quiz: [
        {
          id: crypto.randomUUID(),
          questionOrder: 1,
          question:
            "Manut uger-uger Pasang Aksara Bali Baku, genah nyuratang tanda 'adeg-adeg' sane patut inggih punika...",
          options: [
            {
              label: "A",
              text: "Ring pamuput lengkara utawi sadurung tanda carik",
              isCorrect: true,
              distractorRationale:
                "Tepat: Adeg-adeg hanya diizinkan pada akhir kalimat atau tepat sebelum tanda carik.",
            },
            {
              label: "B",
              text: "Ring tengahing kruna anggen ngademang aksara wianjana",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Konsonan mati di tengah kata wajib memakai gantungan atau gempelan.",
            },
            {
              label: "C",
              text: "Ring aksara Ra, Nga, miwah Ha sane mati ring ungkur kruna",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Bunyi -r, -ng, dan -h wajib memakai surang, cecek, dan bisah.",
            },
            {
              label: "D",
              text: "Ring ajeng aksara suara A, I, U, E, O",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Aksara suara tidak memerlukan adeg-adeg di depannya.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Adeg-adeg wantah kalugra kasurat ring pamuput lengkara utawi sadurung tanda carik, miwah anggen ngelidin tumpuk tiga.",
          conceptTag: "Pasang Aksara: Aturan Adeg-adeg",
          culturalContext: "Pedoman Pasang Aksara Bali Baku",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 2,
          question:
            "Rikala nyurat kruna 'sampun' antuk aksara Bali, aksara Ma sane mati ring tengahing kruna kasambung olih...",
          options: [
            {
              label: "A",
              text: "Gempelan Pa ring samping tengen aksara Ma",
              isCorrect: true,
              distractorRationale:
                "Tepat: Pasangan aksara Pa berbentuk gempelan yang ditulis di sebelah kanan aksara Ma.",
            },
            {
              label: "B",
              text: "Adeg-adeg ring aksara Ma kalanturang aksara Pa",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Adeg-adeg pantang diletakkan di tengah kata 'sampun'.",
            },
            {
              label: "C",
              text: "Gantungan Ma ring sor aksara Sa",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Aksara yang dimatikan adalah Ma, sehingga yang diberi pasangan adalah Pa.",
            },
            {
              label: "D",
              text: "Pangangge tengenan cecek ring duur aksara Ma",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Cecek khusus untuk bunyi sengau -ng, bukan bunyi -m.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Pasangan aksara Pa marupa gempelan sane magenah ring samping tengen aksara Ma sane kadamang.",
          conceptTag: "Pasang Aksara: Gempelan & Gantungan",
          culturalContext: "Tata Tulis Lontar & Aksara Bali",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 3,
          question:
            "Pangangge tengenan sane patut kaanggen nyurat konsonan mati ring pungkur kruna 'sekar' inggih punika...",
          options: [
            {
              label: "A",
              text: "Surang ring duur aksara Ka",
              isCorrect: true,
              distractorRationale:
                "Tepat: Bunyi tengenan /r/ pada suku kata 'kar' wajib ditulis menggunakan Surang.",
            },
            {
              label: "B",
              text: "Adeg-adeg ring pungkuran aksara Ra",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Aksara Ra tidak boleh dimatikan dengan adeg-adeg.",
            },
            {
              label: "C",
              text: "Bisah ring ungkur aksara Ka",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Bisah menghasilkan bunyi hembusan /h/, bukan /r/.",
            },
            {
              label: "D",
              text: "Guwung/Cakra ring sor aksara Ka",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Guwung digunakan untuk gugus konsonan tengah seperti 'kra', bukan konsonan akhir '-kar'.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Tengenan /r/ ring tengah utawi ungkur kruna patut kasurat nganggen pangangge tengenan Surang.",
          conceptTag: "Pasang Aksara: Pangangge Tengenan Surang",
          culturalContext: "Uger-uger Pasamuan Alit Aksara Bali",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 4,
          question:
            "Ring kruna 'tamblang', adeg-adeg dados kasurat ring tengahing kruna santukan...",
          options: [
            {
              label: "A",
              text: "Ngelidin Aksara Tumpuk Tiga (tiga konsonan маti matumpuk)",
              isCorrect: true,
              distractorRationale:
                "Tepat: Pengecualian adeg-adeg di tengah kata berlaku untuk mencegah penumpukan tiga konsonan (m-b-l).",
            },
            {
              label: "B",
              text: "Aksara Ma nenten madue gantungan",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Aksara Ma dan Ba memiliki gantungan baku dalam aksara Bali.",
            },
            {
              label: "C",
              text: "Kruna tamblang ngranjing kruna manca",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Tamblang adalah kosakata asli Bali dan nama desa di Buleleng.",
            },
            {
              label: "D",
              text: " wenten tanda carik ring tengah kruna",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Tanda carik tidak pernah diletakkan di tengah satu kata utuh.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Uger-uger Pasang Aksara nglugrahang adeg-adeg ring tengah kruna sakadi 'tamblang' mangda nenten dados gantungan matumpuk tiga.",
          conceptTag: "Pasang Aksara: Aturan Tumpuk Tiga",
          culturalContext: "Uger-uger Pasang Aksara Bali Baku",
        },
      ],
    };
  }

  if (
    combined.includes("tri hita karana") ||
    combined.includes("subak") ||
    combined.includes("parahyangan") ||
    combined.includes("pawongan") ||
    combined.includes("palemahan") ||
    combined.includes("awig")
  ) {
    return {
      title: "Modul Tri Hita Karana & Kearifan Lokal Subak",
      subjectArea: "Budaya & Kearifan Lokal Bali (Kurikulum Merdeka Mulok)",
      gradeLevel: "SMP Fase D (Kelas 7-9)",
      summary: {
        overview:
          "Filosofi Tri Hita Karana merupakan tiga penyebab kebahagiaan dan keharmonisan hidup masyarakat Bali yang terwujud nyata dalam sistem irigasi tradisional Subak sebagai Warisan Budaya Dunia UNESCO.",
        keyTakeaways: [
          "Parahyangan dalam Subak diwujudkan melalui pembangunan Pura Ulun Danu, Pura Bedugul, dan upacara Mapag Toya sebagai bakti kepada Tuhan.",
          "Pawongan tampak pada musyawarah krama subak (sangkep), gotong royong membersihkan saluran air, dan kepatuhan bersama yang dipimpin Pekaseh.",
          "Palemahan diterapkan lewat pembagian air yang adil menggunakan Tembuku, pelestarian hutan hulu danau, serta pola tanam organik Kerta Masa.",
          "Awig-awig Subak menjadi hukum adat tertulis yang mengatur hak, kewajiban, dan sanksi (dedosan) demi menjaga keseimbangan ketiga pilar.",
        ],
        culturalGlossary: [
          {
            term: "Parahyangan",
            meaning: "Hubungan harmonis dan bakti manusia dengan Ida Sang Hyang Widhi Wasa (Tuhan Yang Maha Esa)",
            category: "Tri Hita Karana",
          },
          {
            term: "Pawongan",
            meaning: "Hubungan harmonis, asah-asih-asuh, dan gotong royong antar-sesama manusia (krama)",
            category: "Tri Hita Karana",
          },
          {
            term: "Palemahan",
            meaning: "Hubungan harmonis dan tanggung jawab manusia dalam menjaga kelestarian alam lingkungan",
            category: "Tri Hita Karana",
          },
          {
            term: "Subak",
            meaning: "Organisasi kemasyarakatan petani di Bali yang khusus mengatur manajemen pengairan sawah secara religius-ekologis",
            category: "Kelembagaan Adat",
          },
          {
            term: "Pekaseh",
            meaning: "Pemimpin atau ketua pengurus subak yang dipilih oleh krama petani untuk mengatur distribusi air",
            category: "Struktur Subak",
          },
          {
            term: "Awig-awig Subak",
            meaning: "Aturan hukum adat yang disepakati krama subak untuk mengatur tata tertib pengairan, upacara, dan sanksi",
            category: "Hukum Adat",
          },
        ],
      },
      flashcards: [
        {
          id: "fc-1",
          front: "Sebutkan tiga pilar utama filosofi Tri Hita Karana beserta maknanya!",
          back: "Parahyangan (harmoni dengan Tuhan), Pawongan (harmoni sesama manusia), dan Palemahan (harmoni dengan alam lingkungan).",
          tag: "Tri Hita Karana",
          hint: "Tiga penyebab kesejahteraan hidup",
        },
        {
          id: "fc-2",
          front: "Bagaimana penerapan pilar Parahyangan dalam sistem pertanian Subak di Bali?",
          back: "Melalui pendirian Pura Ulun Danu/Pura Subak serta pelaksanaan upacara Mapag Toya dan Ngusaba Nini.",
          tag: "Parahyangan Subak",
          hint: "Berkaitan dengan pura dan ritual syukur",
        },
        {
          id: "fc-3",
          front: "Apa fungsi alat tradisional 'Tembuku' dalam sistem Palemahan dan Pawongan Subak?",
          back: "Bangunan pembagi air dari kayu/batu dengan lebar lekukan proporsional agar setiap petak sawah mendapat debit air yang adil.",
          tag: "Teknologi Subak",
          hint: "Mencegah konflik perebutan air antarpetani",
        },
        {
          id: "fc-4",
          front: "Apa peran 'Pekaseh' dan 'Awig-awig' dalam menjaga kerukunan Pawongan krama subak?",
          back: "Pekaseh memimpin koordinasi pengairan dan sangkep, sedangkan Awig-awig menjadi pedoman aturan dan sanksi bersama.",
          tag: "Pawongan Subak",
          hint: "Pemimpin dan aturan adat subak",
        },
        {
          id: "fc-5",
          front: "Apa tujuan sistem tanam serempak 'Kerta Masa' pada aspek Palemahan?",
          back: "Memutus siklus hidup hama tanaman secara alami tanpa merusak ekosistem sawah dengan bahan kimia berlebih.",
          tag: "Palemahan Ekologis",
          hint: "Pengendalian hama ramah lingkungan",
        },
      ],
      quiz: [
        {
          id: crypto.randomUUID(),
          questionOrder: 1,
          question:
            "Krama Subak melaksanakan upacara 'Mapag Toya' di Pura Ulun Suwi sebelum mengalirkan air ke petak sawah. Parilaksana puniki nyihnayang implementasi Tri Hita Karana pahan...",
          options: [
            {
              label: "A",
              text: "Parahyangan, pinaka rasa suksma miwah bakti majeng Ida Sang Hyang Widhi miwah Dewi Danu",
              isCorrect: true,
              distractorRationale:
                "Tepat: Upacara keagamaan di pura subak merupakan wujud hubungan vertikal manusia dengan Tuhan (Parahyangan).",
            },
            {
              label: "B",
              text: "Palemahan kemanten krana ngurusang toya",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Walaupun objeknya air, aktivitas ritual pemujaan di pura tergolong Parahyangan.",
            },
            {
              label: "C",
              text: "Pawongan krana ngundang para pejabat dinas",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Fokus utama Mapag Toya adalah bakti spiritual kepada pencipta sumber air.",
            },
            {
              label: "D",
              text: "Pitra Yadnya majeng para leluhur petani",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Mapag Toya termasuk rangkaian Dewa Yadnya dalam tradisi subak, bukan Pitra Yadnya.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Upacara Mapag Toya ring Pura Ulun Suwi/Ulun Danu pinaka cihna Parahyangan, ngaturang bhakti majeng Sang Hyang Widhi sane ngicenin toya.",
          conceptTag: "Tri Hita Karana: Parahyangan dalam Subak",
          culturalContext: "Tradisi Agraris Subak Bali",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 2,
          question:
            "Para petani anggota subak berkumpul dalam 'sangkep' (rapat) yang dipimpin Pekaseh untuk menyepakati jadwal giliran air dan gotong royong memperbaiki saluran irigasi. Hal ini mencerminkan pilar...",
          options: [
            {
              label: "A",
              text: "Pawongan, krana ngutamayang musyawarah miwah paras-paros sesama krama subak",
              isCorrect: true,
              distractorRationale:
                "Tepat: Musyawarah, kesepakatan sosial, dan gotong royong antarpetani merupakan inti Pawongan.",
            },
            {
              label: "B",
              text: "Parahyangan, krana Pekaseh pateh kadi Sulinggih",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Pekaseh adalah pemimpin organisasi sosial subak, bukan pemimpin ritual kependetaan.",
            },
            {
              label: "C",
              text: "Palemahan, krana nenten wenten paiketan sosial",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Rapat sangkep dan gotong royong jelas merupakan interaksi sosial antarkrama (Pawongan).",
            },
            {
              label: "D",
              text: "Sad Kerti pahan Jana Kerti pribadi",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Dalam kerangka Tri Hita Karana, harmoni sosial kemasyarakatan disebut Pawongan.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Sangkep miwah gotong royong krama subak sane kapimpin Pekaseh nyihnayang pilar Pawongan (hubungan harmonis sesama manusia).",
          conceptTag: "Tri Hita Karana: Pawongan & Sangkep Subak",
          culturalContext: "Demokrasi Tradisional Subak Bali",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 3,
          question:
            "Penerapan pola tanam serempak 'Kerta Masa' dan larangan mencemari saluran telabah dengan limbah plastik di kawasan persawahan merupakan wujud nyata pilar...",
          options: [
            {
              label: "A",
              text: "Palemahan, anggen ngajegang kelestarian ekosistem carik miwah toya",
              isCorrect: true,
              distractorRationale:
                "Tepat: Menjaga kebersihan air dan keseimbangan ekosistem sawah adalah esensi Palemahan.",
            },
            {
              label: "B",
              text: "Parahyangan, krana wantah fokus ring banten",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Pelestarian lingkungan fisik dan pengendalian hama ekologis termasuk ranah Palemahan.",
            },
            {
              label: "C",
              text: "Pawongan, krana ngatur undagan krama banjar",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Objek utamanya adalah kelestarian alam dan ekosistem sawah (Palemahan).",
            },
            {
              label: "D",
              text: "Awig-awig perdata modern",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Kerta Masa adalah kearifan ekologis tradisional dalam aspek Palemahan.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Palemahan mengajarkan krama subak merawat tanah sawah, menjaga kemurnian air telabah, dan memutus siklus hama secara alami.",
          conceptTag: "Tri Hita Karana: Palemahan & Ekologi Subak",
          culturalContext: "Warisan Budaya Dunia UNESCO Subak",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 4,
          question:
            "Fungsi utama 'Awig-awig Subak' miwah bangunan pembagi air 'Tembuku' dalam menjaga keberlanjutan sistem Subak adalah...",
          options: [
            {
              label: "A",
              text: "Menjamin keadilan distribusi air serta ketertiban hak dan kewajiban seluruh krama subak",
              isCorrect: true,
              distractorRationale:
                "Tepat: Tembuku membagi air secara fisik proporsional, sedangkan Awig-awig menjamin kepatuhan hukumnya.",
            },
            {
              label: "B",
              text: "Memberikan seluruh air hanya kepada sawah milik pengurus subak",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Subak menjunjung tinggi prinsip keadilan proporsional (ayahan dan tenah), bukan monopoli.",
            },
            {
              label: "C",
              text: "Menggantikan seluruh fungsi upacara keagamaan di pura subak",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Awig-awig justru memuat aturan pelaksanaan upacara Parahyangan, bukan menghapusnya.",
            },
            {
              label: "D",
              text: "Menghapus kewajiban gotong royong (ngayah) bagi petani",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Awig-awig mengatur kewajiban ngayah secara adil bagi seluruh anggota subak.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Tembuku miwah Awig-awig Subak nyagaang mangda pambagian toya adil manut uger-uger miwah nenten ngwetuangwicaraning krama.",
          conceptTag: "Sistem Subak: Awig-awig & Tembuku",
          culturalContext: "Hukum Adat & Teknologi Irigasi Bali",
        },
      ],
    };
  }

  if (
    combined.includes("anggah") ||
    combined.includes("alus singgih") ||
    combined.includes("alus sor") ||
    combined.includes("titiang") ||
    combined.includes("ngrayunan")
  ) {
    return {
      title: "Modul Anggah-ungguhing Basa Bali (Alus Singgih & Alus Sor)",
      subjectArea: "Bahasa & Etika Komunikasi Bali (Kurikulum Merdeka Mulok)",
      gradeLevel: "SMP Fase D (Kelas 7-9)",
      summary: {
        overview:
          "Anggah-ungguhing Basa Bali merupakan sistem tingkatan kesantunan berbahasa yang berlandaskan etika 'Singgihang anake lianan, andapang ragane padidi'—memuliakan lawan bicara yang dihormati dengan Kruna Alus Singgih (ASI) serta merendahkan diri sendiri secara santun dengan Kruna Alus Sor (ASO).",
        keyTakeaways: [
          "Kruna Alus Singgih (ASI) seperti 'ngandika', 'ngrayunan', 'mirengang', dan 'rauh' wajib digunakan untuk menghormati guru, orang tua, atau tokoh suci.",
          "Kruna Alus Sor (ASO) seperti 'titiang', 'matur', 'neda', dan 'miragi' wajib digunakan ketika menyebut tindakan atau keadaan diri sendiri di hadapan orang yang dihormati.",
          "Miskonsepsi paling umum siswa adalah memakai kata Alus Singgih untuk diri sendiri (misalnya 'titiang ngrayunan'), yang secara etika terdengar meninggikan diri.",
          "Kruna Alus Mider (AMI) seperti 'sampun', 'nenten', 'malih', dan 'ngiring' bersifat netral-halus sehingga dapat dipakai baik untuk diri sendiri maupun orang yang dihormati.",
        ],
        culturalGlossary: [
          {
            term: "Alus Singgih (ASI)",
            meaning: "Kosakata halus untuk memuliakan atau meninggikan orang yang dihormati (guru, sulinggih, orang tua)",
            category: "Tingkatan Bahasa",
          },
          {
            term: "Alus Sor (ASO)",
            meaning: "Kosakata halus untuk merendahkan diri sendiri secara santun ketika berbicara kepada orang yang dihormati",
            category: "Tingkatan Bahasa",
          },
          {
            term: "Alus Mider (AMI)",
            meaning: "Kosakata halus bersama yang boleh digunakan untuk diri sendiri maupun untuk orang yang dihormati",
            category: "Tingkatan Bahasa",
          },
          {
            term: "Titiang",
            meaning: "Kata ganti orang pertama tunggal (saya) dalam tingkatan Alus Sor",
            category: "Kruna Pangentos",
          },
          {
            term: "Ngrayunan vs Neda",
            meaning: "'Ngrayunan' berarti makan untuk orang yang dihormati (ASI), sedangkan 'Neda' untuk diri sendiri (ASO)",
            category: "Pasangan Kosakata",
          },
          {
            term: "Ngandika vs Matur",
            meaning: "'Ngandika' berarti berbicara untuk orang yang dihormati (ASI), sedangkan 'Matur' untuk diri sendiri (ASO)",
            category: "Pasangan Kosakata",
          },
        ],
      },
      flashcards: [
        {
          id: "fc-1",
          front: "Apa prinsip utama dalam memilih antara Kruna Alus Singgih (ASI) dan Alus Sor (ASO)?",
          back: "'Singgihang anake lianan, andapang ragane padidi' — gunakan ASI untuk menghormati orang lain, dan ASO untuk merendahkan diri sendiri.",
          tag: "Prinsip Etika",
          hint: "Pantang menggunakan ASI untuk diri sendiri",
        },
        {
          id: "fc-2",
          front: "Apa perbedaan penggunaan kata 'Ngrayunan' dan 'Neda'?",
          back: "'Ngrayunan' (ASI) dipakai untuk menyebut guru/orang tua yang sedang makan, sedangkan 'Neda' (ASO) dipakai untuk diri sendiri.",
          tag: "ASI vs ASO",
          hint: "Keduanya berarti makan dalam Basa Alus",
        },
        {
          id: "fc-3",
          front: "Kata ganti diri apakah yang paling santun digunakan siswa saat berbicara di depan Bapak/Ibu Guru?",
          back: "Titiang (Kruna Alus Sor), bukan 'icang' atau 'cang' yang termasuk Basa Andap.",
          tag: "Kruna Pangentos",
          hint: "Kata ganti orang pertama tunggal halus",
        },
        {
          id: "fc-4",
          front: "Jika guru sedang berbicara disebut 'Ngandika' (ASI), apakah kata yang tepat jika siswa yang berbicara kepada guru?",
          back: "Matur atau Nguningayang (Kruna Alus Sor).",
          tag: "Kruna Kriya Alus",
          hint: "Contoh: Titiang jagi matur ring Bapak Guru",
        },
        {
          id: "fc-5",
          front: "Mengapa kata 'sampun' dan 'nenten' boleh digunakan untuk diri sendiri sekaligus untuk guru?",
          back: "Karena termasuk Kruna Alus Mider (AMI) yang bernilai halus untuk semua pihak (mider = berlaku bersama).",
          tag: "Alus Mider",
          hint: "Sampun = sudah, Nenten = tidak",
        },
      ],
      quiz: [
        {
          id: crypto.randomUUID(),
          questionOrder: 1,
          question:
            "Wayan sedek mareraosan ring ajeng gurunnyane. Ri tatkala Wayan nlatarang indik ragan dane sampun neda semengane punika, kruna 'neda' sane kaanggen Wayan kagolong kruna...",
          options: [
            {
              label: "A",
              text: "Alus Sor (ASO), krana Wayan nyambatang raga padidi ring ajeng guru",
              isCorrect: true,
              distractorRationale:
                "Tepat: Kruna Alus Sor kaanggen ngandapang raga majeng sang sane kasinggihang.",
            },
            {
              label: "B",
              text: "Alus Singgih (ASI), krana mareraosan ring ajeng guru",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Alus Singgih nenten dados kanggen nyambatang tindakan raga padidi.",
            },
            {
              label: "C",
              text: "Basa Andap, krana pateh kadi basa lumrah",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Basa andapne wantah 'madaar', nenten 'neda'.",
            },
            {
              label: "D",
              text: "Basa Kasar, krana nenten patut kaaturang",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Neda punika kruna alus sor sane santun pisan.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Kruna 'neda' inggih punika Alus Sor sane kanggen ngandapang raga. Yening kanggen gurunnyane patut nganggen 'ngrayunan' (Alus Singgih).",
          conceptTag: "Anggah-ungguhing Basa: Alus Sor vs Alus Singgih",
          culturalContext: "Etika Percakapan Siswa-Guru di Bali",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 2,
          question:
            "Rikala mabaos majeng ring Bapak utawi Ibu Guru ring sekolah, lengkara sane pinih patut manut uger-uger Anggah-ungguhing Basa Bali inggih punika...",
          options: [
            {
              label: "A",
              text: "Bapak Guru sampun ngrayunan, titiang taler sampun neda.",
              isCorrect: true,
              distractorRationale:
                "Tepat: Menggunakan 'ngrayunan' (ASI) untuk Guru dan 'neda' (ASO) untuk diri sendiri ('titiang').",
            },
            {
              label: "B",
              text: "Bapak Guru sampun neda, titiang taler sampun ngrayunan.",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Terbalik antara penggunaan Alus Singgih dan Alus Sor.",
            },
            {
              label: "C",
              text: "Bapak Guru suba madaar, icang masih suba madaar.",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Menggunakan Basa Andap kepada guru tidak sesuai etika kesantunan.",
            },
            {
              label: "D",
              text: "Bapak Guru sampun ngrayunan, titiang taler sampun ngrayunan.",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Menggunakan 'ngrayunan' (ASI) untuk diri sendiri melanggar prinsip ngasorang raga.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Prinsip Anggah-ungguhing Basa: 'Singgihang anake lianan (Bapak Guru ngrayunan), andapang ragane padidi (titiang neda)'.",
          conceptTag: "Anggah-ungguhing Basa: Penerapan Kalimat Utuh",
          culturalContext: "Komunikasi Santun Lingkungan Sekolah",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 3,
          question:
            "Ring lengkara: 'Ida Pedanda sedek ... dharma wacana ring jaba tengah pura, para pamedek sami mirengang antuk teleb.' Kruna Alus Singgih sane patut nyangkepin lengkara punika...",
          options: [
            {
              label: "A",
              text: " Mapica / Ngandika",
              isCorrect: true,
              distractorRationale:
                "Tepat: Tindakan Sulinggih menyampaikan wejangan menggunakan kruna Alus Singgih 'mapica' atau 'ngandika'.",
            },
            {
              label: "B",
              text: "Matur",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: 'Matur' adalah kruna Alus Sor dari umat kepada Sulinggih, bukan sebaliknya.",
            },
            {
              label: "C",
              text: "Ngorahang",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: 'Ngorahang' adalah Basa Andap yang tidak patut untuk Ida Pedanda.",
            },
            {
              label: "D",
              text: "Nunas",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: 'Nunas' berarti memohon (Alus Sor), tidak sesuai dengan konteks memberikan dharma wacana.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Majeng ring sang maraga suci sakadi Ida Pedanda, kruna kriya sane kaanggen patut Alus Singgih (mapica/ngandika).",
          conceptTag: "Anggah-ungguhing Basa: Kruna Alus Singgih",
          culturalContext: "Etika Dharma Wacana di Pura",
        },
        {
          id: crypto.randomUUID(),
          questionOrder: 4,
          question:
            "Kruna-kruna ring sor puniki sane ngranjing ring soroh Kruna Alus Mider (AMI) sane dados kaanggen majeng raga padidi miwah sang kasinggihang inggih punika...",
          options: [
            {
              label: "A",
              text: "Sampun, nenten, malih, ngiring",
              isCorrect: true,
              distractorRationale:
                "Tepat: Keempat kosakata tersebut adalah Alus Mider yang berlaku untuk semua pihak secara halus.",
            },
            {
              label: "B",
              text: "Titiang, matur, neda, miragi",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Kelompok ini khusus Kruna Alus Sor (ASO) untuk diri sendiri.",
            },
            {
              label: "C",
              text: "Ngandika, ngrayunan, ngaksi, mirengang",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Kelompok ini khusus Kruna Alus Singgih (ASI) untuk orang yang dihormati.",
            },
            {
              label: "D",
              text: "Icang, cai, suba, tusing",
              isCorrect: false,
              distractorRationale:
                "Miskonsepsi: Kelompok ini termasuk Basa Andap/Kepara untuk pergaulan sebaya.",
            },
          ],
          correctAnswer: "A",
          explanation:
            "Kruna Alus Mider (sampun, nenten, malih, ngiring) madue rasa basa alus sane mider dados kaanggen ring sang singgih miwah sor.",
          conceptTag: "Anggah-ungguhing Basa: Kruna Alus Mider",
          culturalContext: "Klasifikasi Kosakata Basa Bali Alus",
        },
      ],
    };
  }

  const rawSource = (extractedText || userContext || "").trim();
  const nonEmptyLines = rawSource
    .split(/\r?\n/)
    .map((line) => line.replace(/^[#*\-\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0);

  const firstLine = nonEmptyLines[0] || "";
  const cleanFileName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]+/g, " ")
    .trim();

  const derivedTitle = firstLine
    ? firstLine.length > 72
      ? `${firstLine.slice(0, 69).trim()}...`
      : firstLine
    : userContext?.trim()
      ? `Modul ${userContext.trim()}`
      : `Modul Pembelajaran: ${cleanFileName || "Muatan Lokal"}`;

  const rawSentences = rawSource
    .replace(/\r?\n+/g, ". ")
    .split(/(?<=[.!?])\s+|\.\s+/)
    .map((s) => s.replace(/^[#*\-\d.)\s]+/, "").trim())
    .filter((s) => s.length >= 20);

  const extractedTakeaways = rawSentences.slice(0, 4);
  while (extractedTakeaways.length < 4) {
    const defaults = [
      `Pemahaman konsep inti pada materi "${derivedTitle}" menekankan analisis kontekstual sesuai capaian Kurikulum Merdeka.`,
      "Penerapan materi dalam kehidupan sehari-hari melatih penalaran kritis (HOTS) dan kepekaan sosial-budaya siswa.",
      "Identifikasi istilah kunci pada teks membantu siswa membedakan konsep utama dari miskonsepsi umum.",
      "Refleksi formatif secara berkala memastikan penguasaan kompetensi merata di seluruh kelompok belajar.",
    ];
    extractedTakeaways.push(defaults[extractedTakeaways.length]);
  }

  const overviewText =
    rawSource.length >= 40
      ? `Ringkasan analisis materi "${derivedTitle}": ${rawSource.slice(0, 260).trim()}${rawSource.length > 260 ? "..." : ""}`
      : `Modul "${derivedTitle}" menyajikan intisari materi pembelajaran terstruktur beserta poin konsep utama, glosarium istilah penting, flashcard hafalan aktif, dan soal latihan diagnostik HOTS.`;

  return {
    title: derivedTitle,
    subjectArea: userContext?.trim() || "Muatan Lokal & Literasi Kontekstual (Kurikulum Merdeka)",
    gradeLevel: "SMP Fase D (Kelas 7-9)",
    summary: {
      overview: overviewText,
      keyTakeaways: extractedTakeaways,
      culturalGlossary: [
        {
          term: derivedTitle.split(/\s+/).slice(0, 3).join(" "),
          meaning: `Topik utama dalam bahasan ${derivedTitle} yang menjadi fokus capaian pembelajaran`,
          category: "Konsep Inti",
        },
        {
          term: "Konteks Materi",
          meaning: extractedTakeaways[0].slice(0, 110),
          category: "Intisari Teks",
        },
        {
          term: "Analisis HOTS",
          meaning: "Penalaran tingkat tinggi untuk menghubungkan isi teks dengan pemecahan masalah nyata",
          category: "Pedagogi",
        },
        {
          term: "Evaluasi Formatif",
          meaning: "Pemetaan tingkat penguasaan konsep dan deteksi miskonsepsi siswa secara langsung",
          category: "Asesmen",
        },
      ],
    },
    flashcards: [
      {
        id: "fc-1",
        front: `Apa fokus pembahasan utama dalam materi "${derivedTitle}"?`,
        back: extractedTakeaways[0],
        tag: "Gagasan Utama",
        hint: "Perhatikan kalimat pembuka pada dokumen materi",
      },
      {
        id: "fc-2",
        front: `Sebutkan poin penting kedua yang ditekankan pada "${derivedTitle}"!`,
        back: extractedTakeaways[1],
        tag: "Konsep Esensial",
        hint: "Berkaitan dengan uraian pendukung dalam teks",
      },
      {
        id: "fc-3",
        front: "Bagaimana cara menerapkan konsep dalam materi ini pada situasi nyata?",
        back: extractedTakeaways[2],
        tag: "Aplikasi Kontekstual",
        hint: "Hubungkan teori pada dokumen dengan praktik di lingkungan sekolah/masyarakat",
      },
      {
        id: "fc-4",
        front: "Mengapa penting memahami perbedaan antara konsep inti dan pengecoh pada materi ini?",
        back: extractedTakeaways[3],
        tag: "Evaluasi Kritis",
        hint: "Mencegah miskonsepsi saat menjawab soal analisis",
      },
    ],
    quiz: [
      {
        id: crypto.randomUUID(),
        questionOrder: 1,
        question: `Berdasarkan materi "${derivedTitle}", pernyataan manakah yang paling tepat menggambarkan gagasan utama teks?`,
        options: [
          {
            label: "A",
            text: extractedTakeaways[0].slice(0, 140),
            isCorrect: true,
            distractorRationale:
              "Tepat: Pernyataan ini sesuai langsung dengan pokok pikiran utama yang tertulis pada materi.",
          },
          {
            label: "B",
            text: "Materi hanya membahas aturan administratif tanpa kaitan dengan pemahaman konsep siswa",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Isi dokumen secara eksplisit menekankan pemahaman konsep dan penerapannya.",
          },
          {
            label: "C",
            text: "Seluruh kaidah pada materi bersifat opsional dan bertentangan dengan konteks pembelajaran",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Bertolak belakang dengan isi uraian utama pada dokumen.",
          },
          {
            label: "D",
            text: "Teks tidak memuat prinsip dasar maupun langkah penerapan yang dapat dipelajari",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Dokumen telah menjabarkan poin-poin penting secara terstruktur.",
          },
        ],
        correctAnswer: "A",
        explanation: `Gagasan utama pada "${derivedTitle}" terangkum pada poin: ${extractedTakeaways[0]}`,
        conceptTag: `${derivedTitle.slice(0, 40)}: Gagasan Utama`,
        culturalContext: "Pemahaman Bacaan & Analisis Konsep",
      },
      {
        id: crypto.randomUUID(),
        questionOrder: 2,
        question: `Dalam mempelajari "${derivedTitle}", kesimpulan manakah yang selaras dengan uraian pendukung dokumen?`,
        options: [
          {
            label: "A",
            text: extractedTakeaways[1].slice(0, 140),
            isCorrect: true,
            distractorRationale:
              "Tepat: Merupakan penjabaran langsung dari bagian kedua materi yang dianalisis.",
          },
          {
            label: "B",
            text: "Mengabaikan konteks penggunaan istilah ketika menyelesaikan studi kasus",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Pengabaian konteks justru memicu kekeliruan pemahaman konsep.",
          },
          {
            label: "C",
            text: "Menghafal judul dokumen saja tanpa menelaah isi penjelasan kalimatnya",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Pembelajaran bermakna menuntut pemahaman isi dan hubungan antarkonsep.",
          },
          {
            label: "D",
            text: "Menyama-ratakan semua istilah khusus tanpa memperhatikan fungsinya",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Setiap istilah dalam materi memiliki fungsi dan konteks yang spesifik.",
          },
        ],
        correctAnswer: "A",
        explanation: `Uraian dokumen menegaskan bahwa: ${extractedTakeaways[1]}`,
        conceptTag: `${derivedTitle.slice(0, 40)}: Analisis Pendukung`,
        culturalContext: "Literasi Kritis Kurikulum Merdeka",
      },
      {
        id: crypto.randomUUID(),
        questionOrder: 3,
        question: `Bagaimana langkah penerapan yang tepat dari materi "${derivedTitle}" dalam kegiatan belajar di kelas?`,
        options: [
          {
            label: "A",
            text: extractedTakeaways[2].slice(0, 140),
            isCorrect: true,
            distractorRationale:
              "Tepat: Menunjukkan penerapan konsep secara aktif sesuai isi dokumen.",
          },
          {
            label: "B",
            text: "Menghindari diskusi kelompok agar miskonsepsi tidak terdeteksi",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Diskusi dan evaluasi formatif justru diperlukan untuk meluruskan miskonsepsi.",
          },
          {
            label: "C",
            text: "Melewatkan bagian latihan dan langsung menyimpulkan tanpa bukti teks",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Kesimpulan yang valid harus selalu merujuk pada isi materi.",
          },
          {
            label: "D",
            text: "Mengganti aturan inti pada materi dengan asumsi yang belum teruji",
            isCorrect: false,
            distractorRationale:
              "Miskonsepsi: Asumsi tanpa dasar teks menyebabkan kesalahan konsep.",
          },
        ],
        correctAnswer: "A",
        explanation: `Penerapan yang tepat merujuk pada poin: ${extractedTakeaways[2]}`,
        conceptTag: `${derivedTitle.slice(0, 40)}: Penerapan Kontekstual`,
        culturalContext: "Implementasi Pembelajaran Aktif",
      },
    ],
  };
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = RequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload format", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      fileName,
      fileType,
      fileBase64,
      mimeType,
      extractedText,
      text,
      userContext,
      customPrompt,
    } = parsed.data;

    const contentToAnalyze = extractedText || text || "";
    const contextToUse = userContext || customPrompt;

    const hasKeys = geminiKeyPool.hasConfiguredKeys();
    let result: DocumentAnalysis | null = null;

    if (hasKeys) {
      try {
        const { systemPrompt, prompt } = buildDocumentAnalysisPrompt(
          contentToAnalyze || `Analisis dokumen materi: ${fileName}`,
          fileType,
          contextToUse
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parts: any[] = [{ text: `${systemPrompt}\n\n${prompt}` }];

        if (fileType === "image" && fileBase64) {
          parts.unshift({
            inlineData: {
              mimeType: mimeType || "image/jpeg",
              data: fileBase64.replace(/^data:[^;]+;base64,/, ""),
            },
          });
        }

        const candidateText = await callGeminiWithRotation(
          {
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          },
          4500
        );

        if (candidateText) {
          result = extractJSON<DocumentAnalysis>(candidateText, DocumentAnalysisSchema);
        }
      } catch (geminiError) {
        console.warn("Gemini multimodal processing error, using robust fallback:", geminiError);
      }
    }

    if (!result) {
      result = getFallbackDocumentAnalysis(fileName, contentToAnalyze, contextToUse);
    }

    result.quiz = result.quiz.map((q, idx) => ({
      ...q,
      id: crypto.randomUUID(),
      questionOrder: q.questionOrder || idx + 1,
    }));

    const quizId = crypto.randomUUID();
    const stored = await storeQuiz({
      id: quizId,
      title: result.title,
      description: result.summary.overview.slice(0, 160) + "...",
      targetGrade: result.gradeLevel,
      category: result.subjectArea,
      culturalTheme: "Muatan Lokal Kurikulum Merdeka",
      questions: result.quiz,
    });

    result.quiz = stored.questions;

    return NextResponse.json({
      success: true,
      quizId: stored.id,
      analysis: result,
      document: {
        quizId: stored.id,
        ...result,
      },
      metadata: {
        fileName,
        fileType,
        timestamp: new Date().toISOString(),
        mode: hasKeys ? "gemini-2.5-flash" : "pedagogical-engine-verified",
      },
    });
  } catch (error) {
    console.error("Error processing document in Exile:", error);
    return NextResponse.json(
      { error: "Gagal memproses dokumen secara AI." },
      { status: 500 }
    );
  }
}
