const HOST_TOKEN_PREFIX = "exile_host_token:";

function storageKey(roomCode: string): string {
  return `${HOST_TOKEN_PREFIX}${roomCode}`;
}

export function saveHostToken(roomCode: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(roomCode), token);
  } catch {
    // Storage can be unavailable in private browsing; host access then requires re-creating the room.
  }
}

export function getHostToken(roomCode: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey(roomCode));
  } catch {
    return null;
  }
}

export function clearHostToken(roomCode: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(roomCode));
  } catch {
    // Ignore storage failures.
  }
}

export function hostAuthHeaders(roomCode: string): Record<string, string> {
  const token = getHostToken(roomCode);
  return token ? { "x-host-token": token } : {};
}
