import { describe, expect, test } from "bun:test";
import {
  detectMcqInText,
  parseAnswerKeys,
  extractQuizQuestionsFromText,
  applyStudioFallback,
  QUIZ_FALLBACK_NOTIFICATION,
} from "../studio-fallback";
import { QuestionSchema } from "@/types/assessment";

describe("Studio Fallback & MCQ Parser", () => {
  describe("detectMcqInText", () => {
    test("detects numbered questions with lettered options", () => {
      const sample = `Kuis latihan:\n1. Apa pengertian norma?\na. Aturan sosial\nb. Sanksi hukum\nc. Larangan\nd. Kebiasaan`;
      expect(detectMcqInText(sample)).toBe(true);
    });

    test("detects markdown formatted questions", () => {
      const sample = `**1. Norma kesopanan bersumber dari...**\nA. Pergaulan masyarakat\nB. Hukum negara\nC. Kitab suci\nD. Hati nurani`;
      expect(detectMcqInText(sample)).toBe(true);
    });

    test("returns false for regular conversational responses", () => {
      const sample = `Tentu, apakah ingin fokus pada norma hukum, norma kesopanan, atau sanksinya?`;
      expect(detectMcqInText(sample)).toBe(false);
    });

    test("returns false for simple numbered lists without options", () => {
      const sample = `Langkah pembelajaran:\n1. Buka materi norma\n2. Pelajari konsep dasar\n3. Diskusikan contoh kasus`;
      expect(detectMcqInText(sample)).toBe(false);
    });
  });

  describe("parseAnswerKeys", () => {
    test("extracts answer keys accurately", () => {
      const sample = `Kuis materi norma.\n\nKunci jawaban:\n1. A\n2. B\n3. C\n4. D`;
      const keys = parseAnswerKeys(sample);
      expect(keys.get(1)).toBe("A");
      expect(keys.get(2)).toBe("B");
      expect(keys.get(3)).toBe("C");
      expect(keys.get(4)).toBe("D");
    });
  });

  describe("extractQuizQuestionsFromText", () => {
    test("extracts and validates 10 questions from Image 4 style dump", () => {
      const image4Dump = `Kuis latihan, 10 soal pilihan ganda. Kunci ada di bawah:

1. Norma adalah...
a. Aturan atau pedoman yang berlaku dalam kehidupan bermasyarakat
b. Keinginan individu semata
c. Undang-undang formal tanpa sanksi
d. Kebiasaan makan keluarga

2. Fungsi norma hukum dalam kehidupan bernegara adalah...
a. Mewujudkan ketertiban dan keadilan hukum
b. Memberi kebebasan tanpa batas
c. Menghapus hukum adat
d. Membatasi pergaulan sosial

3. Norma kesusilaan bersumber dari...
a. Hati nurani manusia
b. Putusan pengadilan
c. Surat kabar harian
d. Tradisi perdagangan

4. Contoh norma kesopanan di sekolah adalah...
a. Menyapa guru dan teman dengan santun
b. Membayar pajak tepat waktu
c. Mengikuti sidang tilang
d. Menulis undang-undang

5. Sanksi dari pelanggaran norma hukum bersifat...
a. Tegas, nyata, dan memaksa
b. Hukuman moral batiniah saja
c. Celaan dari tetangga semata
d. Rasa malu yang bersifat sementara

6. Lembaga yang menegakkan norma hukum pidana di Indonesia antara lain...
a. Kepolisian dan kejaksaan
b. Tokoh adat desa
c. Dewan kesenian
d. Komite perpustakaan

7. Norma agama memiliki sanksi yang diyakini berupa...
a. Dosa dan pahala dari Tuhan
b. Denda tilang polisi
c. Pengusiran dari organisasi
d. Penahanan di kantor lurah

8. Hubungan antara hak dan kewajiban dalam norma adalah...
a. Berjalan seimbang dan saling melengkapi
b. Menuntut hak tanpa melaksanakan kewajiban
c. Hanya mendahulukan kewajiban orang lain
d. Tidak saling berkaitan satu sama lain

9. Sikap taat terhadap norma hukum di jalan raya ditunjukkan dengan...
a. Memakai helm berstandar SNI dan mematuhi rambu
b. Menerobos lampu merah saat jalan sepi
c. Berkendara tanpa memiliki surat izin
d. Memarkir kendaraan di trotoar pejalan kaki

10. Tujuan utama pembentukan norma di masyarakat adalah...
a. Menciptakan ketenteraman, keadilan, dan ketertiban bersama
b. Memberikan keistimewaan bagi kelompok penguasa
c. Menghilangkan keragaman suku dan adat istiadat
d. Menyeragamkan mata pencaharian warga

Kunci jawaban:
1. A
2. A
3. A
4. A
5. A
6. A
7. A
8. A
9. A
10. A`;

      const questions = extractQuizQuestionsFromText(image4Dump);
      expect(questions.length).toBe(10);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const validation = QuestionSchema.safeParse(q);
        expect(validation.success).toBe(true);
        expect(q.options.length).toBe(4);
        expect(q.correctAnswer).toBe("A");
        expect(q.options[0].isCorrect).toBe(true);
        expect(q.options[1].isCorrect).toBe(false);
      }
    });

    test("handles inline marked keys and preserves explanations", () => {
      const sample = `1. Norma hukum dibuat oleh lembaga yang berwenang.
a. Lembaga negara yang sah (kunci)
b. Lembaga swadaya masyarakat
c. Perkumpulan hobi
d. Tokoh masyarakat informal
Penjelasan: Norma hukum secara resmi disusun dan disahkan oleh lembaga legislatif atau pemerintah yang berwenang.`;

      const questions = extractQuizQuestionsFromText(sample);
      expect(questions.length).toBe(1);
      const q = questions[0];
      expect(q.correctAnswer).toBe("A");
      expect(q.explanation).toContain("Norma hukum secara resmi");
      const validation = QuestionSchema.safeParse(q);
      expect(validation.success).toBe(true);
    });
  });

  describe("applyStudioFallback", () => {
    test("intercepts raw quiz text, pushes action, and replaces reply", () => {
      const rawChatDump = `Berikut soal latihan:
1. Norma kesopanan bersumber dari pergaulan hidup manusia.
a. Pergaulan masyarakat
b. Ketetapan menteri
c. UUD 1945
d. Wahyu ilahi
2. Sanksi norma kesopanan adalah...
a. Celaan atau pengucilan sosial
b. Pidana kurungan penjara
c. Denda administratif
d. Hukuman mati

Kunci jawaban:
1. A
2. A`;

      const result = applyStudioFallback(rawChatDump, [], "Norma dan Nilai");
      expect(result.triggered).toBe(true);
      expect(result.reply).toBe(QUIZ_FALLBACK_NOTIFICATION);
      expect(result.studioActions.length).toBe(1);
      expect(result.studioActions[0].artifactType).toBe("quiz");
      expect(result.studioActions[0].questions?.length).toBe(2);
      expect(result.studioActions[0].topic).toBe("Norma dan Nilai");
    });

    test("passes through normal messages without triggering fallback", () => {
      const normalReply = "Ada yang bisa saya bantu jelaskan tentang norma hukum?";
      const result = applyStudioFallback(normalReply, []);
      expect(result.triggered).toBe(false);
      expect(result.reply).toBe(normalReply);
      expect(result.studioActions.length).toBe(0);
    });
  });
});
