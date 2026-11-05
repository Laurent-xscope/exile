const PLAYER_ID_PREFIX = "exile_player_id:";
const PLAYER_TOKEN_PREFIX = "exile_player_token:";

function idKey(roomCode: string): string {
  return `${PLAYER_ID_PREFIX}${roomCode}`;
}

function tokenKey(roomCode: string): string {
  return `${PLAYER_TOKEN_PREFIX}${roomCode}`;
}

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(key) || window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
    window.sessionStorage.setItem(key, value);
  } catch {
    // Ignore storage failures; the server still issues a fresh identity on next join.
  }
}

export function savePlayerIdentity(
  roomCode: string,
  playerId: string,
  playerToken: string
): void {
  write(idKey(roomCode), playerId);
  write(tokenKey(roomCode), playerToken);
}

export function getPlayerId(roomCode: string): string {
  return read(idKey(roomCode)) || "";
}

export function getPlayerToken(roomCode: string): string {
  return read(tokenKey(roomCode)) || "";
}
