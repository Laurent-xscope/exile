const HOST_TOKEN_PREFIX = "exile_host_token:";
const TAB_ROLE_PREFIX = "exile_tab_role:";

function storageKey(roomCode: string): string {
  return `${HOST_TOKEN_PREFIX}${roomCode}`;
}

function roleKey(roomCode: string): string {
  return `${TAB_ROLE_PREFIX}${roomCode}`;
}

export function saveHostToken(roomCode: string, token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(roomCode), token);
    window.sessionStorage.setItem(storageKey(roomCode), token);
    window.sessionStorage.setItem(roleKey(roomCode), "host");
  } catch {
    // Storage can be unavailable in private browsing; host access then requires re-creating the room.
  }
}

export function isStudentTabForRoom(roomCode: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(roleKey(roomCode)) === "student";
  } catch {
    return false;
  }
}

export function markStudentTabForRoom(roomCode: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(roleKey(roomCode), "student");
    window.sessionStorage.removeItem(storageKey(roomCode));
  } catch {
    // Ignore storage failures.
  }
}

export function getHostToken(roomCode: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (window.sessionStorage.getItem(roleKey(roomCode)) === "student") {
      return null;
    }
    return (
      window.sessionStorage.getItem(storageKey(roomCode)) ||
      window.localStorage.getItem(storageKey(roomCode))
    );
  } catch {
    return null;
  }
}

export function clearHostToken(roomCode: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(roomCode));
    window.sessionStorage.removeItem(storageKey(roomCode));
  } catch {
    // Ignore storage failures.
  }
}

