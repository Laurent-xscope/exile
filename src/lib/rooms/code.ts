export const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_PATTERN = /^\d{6}$/;

/** Keep only digits so pasted "PIN 123 456" becomes "123456". */
export function normalizeRoomCode(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidRoomCode(value?: string | null): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(value));
}
