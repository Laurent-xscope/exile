/**
 * Wayground / Quizizz `odata` character-shift cipher
 * (port of wayground-teardown/reference_impl/odata_cipher.js).
 *
 * Layout: `{prefix}{shiftedBody}{lenChar}{version}` where
 * lenChar = chr(33 + prefix.length). Even positions are shifted by +keySum,
 * odd positions by -keySum, keySum = first + last char code of the key.
 */
export const ODATA_DEFAULT_KEY = "quizizz.com";
export const ODATA_OFFSET_BASE = 33;
export const ODATA_DEFAULT_VERSION = 2;
const ODATA_PREFIX = "quiz";

function keySum(key: string): number {
  if (!key) return 0;
  return key.charCodeAt(0) + key.charCodeAt(key.length - 1);
}

export function decryptOData(ciphertext: string, key = ODATA_DEFAULT_KEY): string {
  if (typeof ciphertext !== "string" || ciphertext.length < 3) return ciphertext;

  const prefixLen = ciphertext.charCodeAt(ciphertext.length - 2) - ODATA_OFFSET_BASE;
  const body = ciphertext.slice(prefixLen, -2);
  const sum = keySum(key);

  let out = "";
  for (let i = 0; i < body.length; i++) {
    out += String.fromCharCode(body.charCodeAt(i) + (i % 2 === 0 ? -sum : sum));
  }
  return out;
}

export function encryptOData(
  plaintext: string,
  key = ODATA_DEFAULT_KEY,
  version = ODATA_DEFAULT_VERSION
): string {
  const sum = keySum(key);
  let shifted = "";
  for (let i = 0; i < plaintext.length; i++) {
    shifted += String.fromCharCode(plaintext.charCodeAt(i) + (i % 2 === 0 ? sum : -sum));
  }
  const lenChar = String.fromCharCode(ODATA_OFFSET_BASE + ODATA_PREFIX.length);
  return `${ODATA_PREFIX}${shifted}${lenChar}${version}`;
}

/** Decrypts `response.odata` and parses it, e.g. `decodeODataResponse(res, "playerGameOver")`. */
export function decodeODataResponse<T = unknown>(
  response: { odata?: string } & Record<string, unknown>,
  key = ODATA_DEFAULT_KEY
): T {
  if (typeof response.odata !== "string") return response as T;
  return JSON.parse(decryptOData(response.odata, key)) as T;
}
