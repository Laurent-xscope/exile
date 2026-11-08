import { extractText, type UploadedFile } from "./documents";
import { runAgent, type ChatMessage, type ToolDef } from "./llm";
import type { Question } from "@/types/assessment";
import type { MindMapNode } from "./prompts";
import { applyStudioFallback } from "./studio-fallback";

export interface AgentDocument {
  name: string;
  text: string;
}

export interface StudioAction {
  type: "create_artifact";
  artifactType: "flashcards" | "quiz" | "summary" | "mindmap" | "infographic" | "table" | "report";
  topic?: string;
  focusAspect?: string;
  count?: number;
  difficulty?: "Mudah" | "Sedang" | "Sulit";
  questions?: Question[];
  mindmap?: MindMapNode;
  summaryText?: string;
}

const EXILE_GUIDE = `Exile — ringkasan fitur yang benar-benar ada:
- Studio (/studio): tempel teks atau unggah PDF/DOCX/TXT/gambar, lalu buat ringkasan, kartu belajar, kuis, slide, mind map.
- Ruang kuis: dari beranda pilih "Ruang kuis". Di halaman ruang guru, unggah materi (PDF/DOCX/TXT/MD) dan AI menyusun soal pilihan ganda.
- PIN: ruang punya PIN 6 digit. Siswa masuk lewat /play atau tautan yang dibagikan, tanpa akun.
- Kontrol guru: mulai kuis, lanjut ke soal berikutnya, tampilkan papan skor, akhiri sesi. Daftar siswa bisa disetujui manual atau otomatis.
- Pengaturan (ikon gigi): bahasa, tema terang/gelap/sistem, suara, durasi soal, kontras tinggi, kepadatan tampilan.`;

function findDoc(docs: Map<string, string>, name: unknown): { key: string; text: string } {
  const wanted = String(name ?? "").trim();
  if (docs.has(wanted)) return { key: wanted, text: docs.get(wanted)! };
  const lower = wanted.toLowerCase();
  for (const [key, text] of docs) {
    if (key.toLowerCase() === lower) return { key, text };
  }
  if (docs.size === 1 && !wanted) {
    const [key, text] = [...docs][0];
    return { key, text };
  }
  throw new Error(`Dokumen "${wanted}" tidak ditemukan. Panggil list_documents.`);
}

function buildTools(docs: Map<string, string>, changed: Set<string>, studioActions: StudioAction[] = []): ToolDef[] {
  return [
    {
      name: "create_studio_artifact",
      description:
        "Buat atau regenerasi artifak langsung di Studio (kuis adaptif, peta konsep/mindmap, intisari/ringkasan, kartu 3d, infografik, tabel, atau laporan). JANGAN PERNAH menempelkan butir soal kuis atau teks panjang peta konsep ke dalam pesan chat. Selalu panggil tool ini untuk menyuntikkan artifak langsung ke studio.",
      parameters: {
        type: "object",
        properties: {
          artifactType: {
            type: "string",
            enum: ["flashcards", "quiz", "summary", "mindmap", "infographic", "table", "report"],
            description: "Jenis artifak studio yang ingin dibuat",
          },
          topic: { type: "string", description: "Topik spesifik artifak" },
          focusAspect: { type: "string", description: "Aspek fokus materi atau kompetensi yang ditekankan" },
          count: { type: "number", description: "Jumlah soal (jika kuis, default 5)" },
          difficulty: { type: "string", enum: ["Mudah", "Sedang", "Sulit"], description: "Tingkat kesulitan" },
        },
        required: ["artifactType"],
      },
      run: (args) => {
        const artifactType = String(args.artifactType || "quiz") as StudioAction["artifactType"];
        const topic = args.topic ? String(args.topic) : undefined;
        const focusAspect = args.focusAspect ? String(args.focusAspect) : undefined;
        const count = args.count ? Number(args.count) : 5;
        const difficulty = (args.difficulty as StudioAction["difficulty"]) || "Sedang";
        studioActions.push({
          type: "create_artifact",
          artifactType,
          topic,
          focusAspect,
          count,
          difficulty,
        });
        const targetTabName =
          artifactType === "quiz"
            ? "Kuis adaptif"
            : artifactType === "mindmap"
              ? "Mind map"
              : artifactType === "summary"
                ? "Ringkasan"
                : artifactType === "flashcards"
                  ? "Kartu 3d"
                  : artifactType;
        return `Artifak ${artifactType} berhasil disusun dan dimasukkan langsung ke tab ${targetTabName} di Studio. Berikan konfirmasi singkat dan ramah kepada guru di chat bahwa artifak telah siap di tab terkait. JANGAN MENULIS BUTIR SOAL ATAU MATERI MENTAH DI PESAN CHAT.`;
      },
    },
    {
      name: "list_documents",
      description: "Daftar dokumen yang tersedia beserta panjang karakternya.",
      parameters: { type: "object", properties: {} },
      run: () =>
        docs.size === 0
          ? "Belum ada dokumen."
          : [...docs].map(([name, text]) => `${name} (${text.length} karakter)`).join("\n"),
    },
    {
      name: "read_document",
      description:
        "Baca isi dokumen (PDF, DOCX, atau teks sudah diubah ke teks). Gunakan offset untuk membaca bagian berikutnya.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          offset: { type: "number", description: "Mulai dari karakter ke-n (default 0)" },
          length: { type: "number", description: "Jumlah karakter (default 6000, maks 10000)" },
        },
        required: ["name"],
      },
      run: (args) => {
        const { key, text } = findDoc(docs, args.name);
        const offset = Math.max(0, Number(args.offset) || 0);
        const length = Math.min(10_000, Math.max(200, Number(args.length) || 6000));
        const slice = text.slice(offset, offset + length);
        const end = offset + slice.length;
        return `[${key} • ${offset}-${end} dari ${text.length}]\n${slice}`;
      },
    },
    {
      name: "search_document",
      description: "Cari kata atau frasa di dokumen. Mengembalikan potongan konteks di sekitarnya.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" }, query: { type: "string" } },
        required: ["name", "query"],
      },
      run: (args) => {
        const { text } = findDoc(docs, args.name);
        const query = String(args.query ?? "").toLowerCase();
        if (!query) return "Kata kunci kosong.";
        const haystack = text.toLowerCase();
        const hits: string[] = [];
        let from = 0;
        while (hits.length < 8) {
          const at = haystack.indexOf(query, from);
          if (at === -1) break;
          hits.push(`@${at}: …${text.slice(Math.max(0, at - 80), at + query.length + 80)}…`);
          from = at + query.length;
        }
        return hits.length ? hits.join("\n") : "Tidak ditemukan.";
      },
    },
    {
      name: "replace_in_document",
      description:
        "Ganti teks persis di dokumen (untuk memperbaiki salah ketik/ejaan). 'find' harus sama persis dengan teks asli.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          find: { type: "string" },
          replace: { type: "string" },
          all: { type: "boolean", description: "Ganti semua kemunculan (default true)" },
        },
        required: ["name", "find", "replace"],
      },
      run: (args) => {
        const { key, text } = findDoc(docs, args.name);
        const find = String(args.find ?? "");
        if (!find) return "Teks yang dicari kosong.";
        if (!text.includes(find)) return "Teks tidak ditemukan. Baca ulang dokumen lalu salin persis.";
        const replace = String(args.replace ?? "");
        const all = args.all !== false;
        const next = all ? text.split(find).join(replace) : text.replace(find, replace);
        const count = all ? text.split(find).length - 1 : 1;
        docs.set(key, next);
        changed.add(key);
        return `Diganti ${count} kali di ${key}.`;
      },
    },
    {
      name: "write_document",
      description: "Tulis atau timpa dokumen teks dengan isi baru. Pakai untuk membuat berkas baru atau menulis ulang seluruhnya.",
      parameters: {
        type: "object",
        properties: { name: { type: "string" }, content: { type: "string" } },
        required: ["name", "content"],
      },
      run: (args) => {
        const name = String(args.name ?? "").trim();
        if (!name) return "Nama dokumen kosong.";
        const content = String(args.content ?? "");
        docs.set(name, content);
        changed.add(name);
        return `Tersimpan: ${name} (${content.length} karakter).`;
      },
    },
    {
      name: "exile_guide",
      description: "Penjelasan fitur Exile dan cara memakainya. Panggil saat pengguna bingung soal Exile.",
      parameters: { type: "object", properties: {} },
      run: () => EXILE_GUIDE,
    },
  ];
}

const SYSTEM = `Kamu asisten di Exile, aplikasi kuis kelas untuk guru. Tugasmu: membantu guru mengolah materi ajar mereka, menyusun artifak studio secara interaktif, dan menjelaskan cara memakai Exile.

Cara kerja dokumen:
- Kalau ada dokumen, baca dulu dengan read_document sebelum menjawab soal isinya. Jangan menebak isi dokumen.
- Untuk memperbaiki salah ketik atau ejaan: baca, lalu pakai replace_in_document untuk tiap perbaikan. Jangan menulis ulang seluruh dokumen kecuali diminta. Setelah selesai, sebutkan perubahan yang kamu buat.
- Kalau pengguna bingung soal Exile, panggil exile_guide dan jelaskan langkah yang relevan saja. Jangan mengarang fitur yang tidak ada di panduan.
- Kalau tidak ada dokumen dan pengguna tidak memintanya, jangan berpura-pura ada.

ATURAN MUTLAK KONTROL STUDIO & ARTIFAK (SMART UI INTERAKTIF):
- Kamu memiliki kontrol penuh atas Studio materi ajar guru di Exile. Kamu dapat membuat atau memperluas kuis adaptif, peta konsep (mind map), intisari materi, kartu 3d, infografik, tabel, dan laporan pedagogis.
- LARANGAN KERAS: JANGAN PERNAH menempelkan butir soal kuis (soal nomor 1, 2, 3... pilihan ganda a, b, c, d), kunci jawaban, atau struktur artifak mentah ke dalam pesan chat. Balasan chat BUKAN tempat menampung artifak. Seluruh artifak wajib dimasukkan langsung ke Studio menggunakan tool create_studio_artifact.
- PERMINTAAN UMUM / AMBIGU (WAJIB TANYA BALIK):
  Jika permintaan guru masih umum, ambigu, atau singkat (misalnya 'buatkan kuis', 'kusi latihan', 'perluas materi', 'buatkan mind map', 'tolong ringkas'):
  JANGAN langsung membuat artifak dan JANGAN mengetik butir soal di chat. Tanyakan balik terlebih dahulu dengan ramah dan terstruktur (maksimal 2-3 poin pertanyaan singkat):
  1. Aspek spesifik materi apa yang ingin difokuskan (misalnya: apakah fokus ke norma hukum, norma sosial, atau sanksinya).
  2. Capaian pembelajaran atau fungsi kompetensi apa yang ingin ditekankan untuk siswa.
  3. Tingkat kesulitan yang diinginkan (Mudah, Sedang, atau Sulit) serta perkiraan jumlah soal jika membuat kuis.
- PERMINTAAN SPESIFIK / SUDAH DIKONFIRMASI:
  Jika guru sudah memberikan instruksi yang spesifik ATAU telah menjawab pertanyaan klarifikasi:
  Segera panggil tool create_studio_artifact agar artifak langsung dimasukkan ke tab Studio.
  Setelah tool selesai, berikan konfirmasi singkat bahwa artifak telah siap di tab Studio terkait dan siap diuji atau diedit di sana. Jangan mengetik butir soal lagi di chat.
- PERFORMA & TAMPILAN: Jaga balasan chat tetap ringkas, terstruktur rapi, tanpa dinding teks berlebih, tidak menyebabkan crash/hang, dan tidak menyebabkan glitch tampilan atau overflow.

Gaya: bahasa Indonesia sehari-hari, singkat dan langsung. Tanpa pembuka klise seperti "Tentu!" atau "Berikut adalah", tanpa penutup menawarkan bantuan lagi, tanpa emoji. Pakai daftar hanya kalau memang berurutan.`;

export async function runExileAgent(params: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  documents?: AgentDocument[];
  attachments?: UploadedFile[];
  context?: string;
}): Promise<{
  reply: string;
  steps: Array<{ tool: string; summary: string }>;
  changedDocuments: AgentDocument[];
  attachmentErrors: string[];
  studioActions: StudioAction[];
}> {
  const docs = new Map<string, string>();
  for (const d of params.documents ?? []) {
    if (d.name && d.text) docs.set(d.name, d.text);
  }
  const attachmentErrors: string[] = [];
  if (params.attachments && params.attachments.length > 0) {
    await Promise.all(
      params.attachments.map(async (file) => {
        try {
          const text = await extractText(file);
          docs.set(file.name, text);
        } catch (err) {
          attachmentErrors.push(`${file.name}: ${err instanceof Error ? err.message : "gagal dibaca"}`);
        }
      })
    );
  }

  const changed = new Set<string>();
  const studioActions: StudioAction[] = [];
  const tools = buildTools(docs, changed, studioActions);

  const system = [
    SYSTEM,
    params.context ? `Konteks halaman: ${params.context}` : "",
    docs.size > 0
      ? `Dokumen tersedia: ${[...docs].map(([n, t]) => `${n} (${t.length} karakter)`).join(", ")}`
      : "Belum ada dokumen.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: system },
    ...params.messages.slice(-12).map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
  ];

  const result = await runAgent(messages, tools);
  const fallback = applyStudioFallback(
    result.reply,
    studioActions,
    params.documents?.[0]?.name
  );

  return {
    reply: fallback.reply,
    steps: result.steps,
    changedDocuments: [...changed].map((name) => ({ name, text: docs.get(name) ?? "" })),
    attachmentErrors,
    studioActions: fallback.studioActions,
  };
}
