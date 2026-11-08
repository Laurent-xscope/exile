import { describe, expect, it } from "bun:test";
import {
  splitMessagePins,
  getToastSignature,
} from "../single-toaster";

describe("SingleToaster helper contracts", () => {
  it("splits text with no PINs into a single non-pin segment", () => {
    const result = splitMessagePins("Ruangan kuis telah ditutup");
    expect(result).toEqual([
      { text: "Ruangan kuis telah ditutup", isPin: false },
    ]);
  });

  it("handles empty or falsy strings gracefully", () => {
    expect(splitMessagePins("")).toEqual([]);
  });

  it("extracts a single 6-digit PIN and preserves surrounding text", () => {
    const result = splitMessagePins("Ruangan berhasil dibuat! Pin: 123456");
    expect(result).toEqual([
      { text: "Ruangan berhasil dibuat! Pin: ", isPin: false },
      { text: "123456", isPin: true },
    ]);
  });

  it("extracts multiple 6-digit PINs correctly", () => {
    const result = splitMessagePins("PIN lama 111222 diganti menjadi 333444 sekarang");
    expect(result).toEqual([
      { text: "PIN lama ", isPin: false },
      { text: "111222", isPin: true },
      { text: " diganti menjadi ", isPin: false },
      { text: "333444", isPin: true },
      { text: " sekarang", isPin: false },
    ]);
  });

  it("ignores non-6-digit numbers like 3, 45, or 1234567", () => {
    const result = splitMessagePins("Soal 3 durasi 45 dtk kode 1234567");
    expect(result).toEqual([
      { text: "Soal 3 durasi 45 dtk kode 1234567", isPin: false },
    ]);
  });

  it("normalizes toast item into stable signature to prevent flicker", () => {
    const item1 = {
      type: "success",
      title: "Ruangan berhasil dibuat! Pin: 888999",
      description: "",
    };
    const item2 = {
      type: "success",
      title: "Ruangan berhasil dibuat! Pin: 888999",
      description: "",
    };
    expect(getToastSignature(item1)).toBe("success:ruangan berhasil dibuat! pin: 888999:");
    expect(getToastSignature(item1)).toBe(getToastSignature(item2));
  });

  it("handles function titles and undefined descriptions in toast signature", () => {
    const item = {
      type: "error",
      title: () => "Terjadi kesalahan koneksi",
    };
    expect(getToastSignature(item)).toBe("error:terjadi kesalahan koneksi:");
  });
});
