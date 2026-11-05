import { describe, expect, test } from "bun:test";
import { isValidRoomCode, normalizeRoomCode } from "../code";

describe("room codes", () => {
  test("normalizes pasted PINs to digits", () => {
    expect(normalizeRoomCode(" 123 456 ")).toBe("123456");
    expect(normalizeRoomCode("PIN: 135790")).toBe("135790");
  });

  test("accepts exactly six digits", () => {
    expect(isValidRoomCode("123456")).toBe(true);
    expect(isValidRoomCode(" 123 456 ")).toBe(true);
    expect(isValidRoomCode("12345")).toBe(false);
    expect(isValidRoomCode("1234567")).toBe(false);
    expect(isValidRoomCode("ABC123")).toBe(false);
  });
});
