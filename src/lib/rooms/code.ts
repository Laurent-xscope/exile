const ROOM_CODE_PATTERN = /^\d{6}$/;

/** Keep only digits so pasted "PIN 123 456" becomes "123456". */
export function normalizeRoomCode(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

export function isValidRoomCode(value?: string | null): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(value));
}

/** Generate a cryptographically uniform 6-digit PIN in range 100000 - 999999. */
export function generateRandomRoomPin(): string {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const val = 100000 + (buffer[0] % 900000);
  return val.toString();
}
