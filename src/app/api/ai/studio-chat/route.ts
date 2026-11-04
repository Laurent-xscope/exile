import { NextResponse } from "next/server";
import { z } from "zod";
import { callGeminiWithRotation, geminiKeyPool } from "@/lib/ai/gateway";

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const StudioChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
  documentContext: z.string().optional(),
  documentTitle: z.string().optional(),
  currentTab: z.string().optional(),
  studentPov: z.boolean().optional().default(false),
  image: z
    .object({
      base64: z.string(),
      mimeType: z.string(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = StudioChatRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format pesan tidak valid", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { messages, documentContext, documentTitle, currentTab, studentPov, image } =
      parsed.data;

    const hasDocument = Boolean(documentContext && documentContext.trim().length > 15);

    const systemInstruction = `Anda adalah Exile Copilot, asisten pedagogis cerdas yang mendampingi pengajar di Exile Studio (https://www.exile.web.id/studio).

IDENTITAS & PANDUAN UTAMA:
1. Nama Anda adalah Exile Copilot.
2. Anda memahami secara mendalam seluruh ekosistem dan fitur Exile Studio:
   - Sumber bahan ajar: Input teks materi ajar, atau unggah dokumen (PDF, gambar lembar kerja, catatan teks).
   - Buatkan artifak (Create): Menghasilkan artifak ajar secara on-demand setelah materi dimasukkan.
   - Intisari: Ringkasan eksekutif materi dengan poin-poin penting esensial.
   - Kartu belajar 3D: Kartu tanya-jawab interaktif tiga dimensi untuk memorisasi mandiri siswa dengan petunjuk praktis.
   - Kuis adaptif: Bank soal bergradasi 3 tingkat kesulitan (Level 1: Dasar, Level 2: Sedang, Level 3: Menantang) dengan analisis jebakan pengecoh dan pembahasan pedagogis.
   - Slide deck: Presentasi ringkas siap pakai lengkap dengan catatan pengajar (presenter notes).
   - Mind map: Pohon konsep materi yang terstruktur hierarkis.
   - Laporan pedagogis: Analisis capaian kompetensi, prasyarat belajar, dan titik keraguan siswa.
   - Tabel data: Rekapitulasi indikator dan bobot kompetensi.
   - Infografis: Rangkuman pilar inti dan jembatan keledai visual.
   - Sudut pandang siswa: Mode simulasi untuk merasakan bagaimana murid mencerna materi, analogi yang masuk akal, dan menyembunyikan jawaban untuk latihan.
   - Buka ruang kuis: Meluncurkan ruangan interaktif dengan kode PIN unik agar murid dapat bergabung dan berlomba secara real-time.

ATURAN KONTEKS DOKUMEN:
${
  hasDocument
    ? `DOKUMEN AKTIF TERSEDIA:
Judul: ${documentTitle || "Dokumen materi"}
Tab yang sedang dibuka: ${currentTab || "Intisari"}
--- ISI MATERI ---
${documentContext?.slice(0, 5000)}
--- AKHIR MATERI ---
Jawablah pertanyaan pengajar dengan mengacu pada materi dokumen di atas.`
    : `DOKUMEN BELUM DIUNGGAH / KOSONG:
Pengguna BELUM mengunggah dokumen apapun. JANGAN PERNAH mengarang atau mengklaim bahwa pengguna telah mengunggah modul apapun (seperti modul bahasa tertentu atau materi spesifik lainnya). Sapa pengguna dengan ramah sebagai Exile Copilot, jelaskan langkah mudah untuk memulai (ketik/unggah materi di kolom sebelah kiri lalu klik Buatkan), dan bantu jelaskan fitur-fitur Exile jika ditanyakan.`
}

${
  studentPov
    ? `MODE KHUSUS: SUDUT PANDANG SISWA.
Jawab dari sudut pandang siswa: jelaskan apa yang membuat konsep ini menantang, analogi santai yang relatable untuk siswa, dan cara mereka memahaminya tanpa rasa takut salah.`
    : `MODE KHUSUS: PANDUAN PENGAJAR.
Bantu pengajar menyempurnakan strategi mengajar, mengantisipasi miskonsepsi siswa, atau memahami cara kerja fitur Exile Studio.`
}

ANALISIS GAMBAR / TANGKAPAN LAYAR (JIKA DILAMPIRKAN):
Jika pengajar melampirkan gambar tangkapan layar fitur atau tampilan layar Exile Studio, analisislah gambar tersebut. Kenali bagian tombol, menu, atau kartu mana yang ditampilkan, lalu jelaskan fungsinya secara lugas dan ramah kepada pengajar.

GAYA KOMUNIKASI:
- Hangat, profesional, langsung ke inti jawaban.
- Hindari huruf kapital berlebihan (tanpa all-caps). Gunakan kalimat normal dan rapi.
- Format teks dengan markdown (bullet points, bold) agar nyaman dibaca.`;

    if (geminiKeyPool.hasConfiguredKeys()) {
      // Build contents for Gemini multi-turn
      const geminiContents = messages.map((m, index) => {
        const isLatest = index === messages.length - 1;
        const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
          { text: m.content },
        ];

        // Attach image to the latest user message if provided
        if (isLatest && m.role === "user" && image && image.base64) {
          const cleanBase64 = image.base64.includes(",")
            ? image.base64.split(",")[1]
            : image.base64;
          parts.unshift({
            inlineData: {
              mimeType: image.mimeType || "image/png",
              data: cleanBase64,
            },
          });
        }

        return {
          role: m.role === "assistant" ? "model" : "user",
          parts,
        };
      });

      try {
        const reply = await callGeminiWithRotation(
          {
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: geminiContents,
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 1024,
            },
          },
          6000
        );

        if (reply && reply.trim().length > 0) {
          return NextResponse.json({
            reply: reply.trim(),
            source: "gemini",
          });
        }
      } catch (err) {
        console.warn("[Studio Chat] Gemini call failed, using guided fallback:", err);
      }
    }

    // Deterministic fallback response
    const latestUserMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
    let fallbackReply = "";

    if (image) {
      fallbackReply = `Terima kasih telah melampirkan gambar tangkapan layar! Gambar ini menampilkan antarmuka Exile Studio. Di Exile Studio, Anda dapat:\n1. **Memasukkan Materi:** Mengisi teks atau mengunggah PDF/gambar lembar kerja di panel kiri.\n2. **Buatkan Artifak:** Mengklik tombol untuk menghasilkan intisari, kartu 3D, kuis adaptif, slide, mind map, dan infografis.\n3. **Buka Ruang Kuis:** Membagikan kode PIN unik agar murid dapat berpartisipasi langsung dari perangkat mereka.\n\nApakah ada bagian spesifik dari tampilan ini yang ingin Anda tanyakan lebih lanjut?`;
    } else if (!hasDocument) {
      if (latestUserMsg.includes("cara") || latestUserMsg.includes("fitur") || latestUserMsg.includes("pakai")) {
        fallbackReply = `Berikut panduan ringkas menggunakan **Exile Studio**:\n1. **Masukkan Materi:** Ketik teks bahan ajar atau unggah berkas (PDF / Gambar lembar kerja / Teks) di panel kiri.\n2. **Klik 'Buatkan Artifak':** Sistem akan bernalar dan menyusun 8 artifak ajar (intisari, kartu 3D, kuis adaptif, slide, mind map, laporan, tabel, dan infografis).\n3. **Buka Ruang Kuis:** Klik tombol 'Buka Ruang Kuis' di sudut kanan atas untuk mendapatkan kode PIN kelas interaktif bagi siswa.\n4. **Sudut Pandang Siswa:** Gunakan tombol sakelar di pojok atas untuk melihat materi dari kacamata pemikiran murid!`;
      } else {
        fallbackReply = `Halo! Saya **Exile Copilot**. Saat ini belum ada dokumen materi yang diunggah.\n\nSilakan masukkan teks materi ajar Anda di panel kiri atau unggah berkas lembar kerja (PDF/Gambar/Teks), lalu klik tombol **Buatkan Artifak**. Saya siap membantu Anda menyusun kuis, merancang presentasi, atau menjawab pertanyaan seputar fitur Exile!`;
      }
    } else {
      if (studentPov) {
        fallbackReply = `Dari sudut pandang siswa, poin utama materi ini dapat dipahami lebih mudah bila dihubungkan dengan pengalaman nyata sehari-hari. Siswa terbantu jika kita memberikan analogi konkret sebelum masuk ke istilah teknis.\n\nAda konsep tertentu yang ingin dijelaskan dengan bahasa ramah siswa?`;
      } else {
        fallbackReply = `Berdasarkan materi yang telah diproses, Anda dapat mengeksplorasi setiap artifak pada tab di atas: **Intisari**, **Kartu 3D**, **Kuis Adaptif**, **Slide Deck**, **Mind Map**, dan **Infografis**. Bila Anda ingin menguji pemahaman kelas, gunakan tombol **Buka Ruang Kuis** di kanan atas.`;
      }
    }

    return NextResponse.json({
      reply: fallbackReply,
      source: "fallback",
    });
  } catch (error) {
    console.error("[Studio Chat Error]:", error);
    return NextResponse.json(
      { error: "Gagal memproses pesan asisten studio" },
      { status: 500 }
    );
  }
}
