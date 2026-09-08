export type SessionData = {
  sessionId: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
};

const SESSION_STORAGE_KEY = "bankiq_session";
const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const generateSessionId = (userId: string) =>
  `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createSession(userId: string, timeoutMs = DEFAULT_SESSION_TIMEOUT_MS) {
  const now = Date.now();
  const session: SessionData = {
    sessionId: generateSessionId(userId),
    userId,
    createdAt: now,
    expiresAt: now + timeoutMs,
  };

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  console.log("[session] createSession:", session);
  return session;
}

export function getSession(): SessionData | null {
  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  console.log("[session] getSession raw:", raw);

  if (!raw) {
    console.log("[session] getSession: no session found");
    return null;
  }
  try {
    const session = JSON.parse(raw) as SessionData;
    console.log("[session] getSession parsed:", session);
    return session;
  } catch (error) {
    console.error("[session] getSession parse error:", error);
    endSession();
    return null;
  }
}

export function isSessionValid(): boolean {
  const session = getSession();
  console.log("[session] isSessionValid check:", session);
  if (!session) {
    console.log("[session] isSessionValid: invalid because no session");
    return false;
  }

  if (Date.now() > session.expiresAt) {
    console.log("[session] isSessionValid: expired session", session);
    endSession();
    return false;
  }

  console.log("[session] isSessionValid: valid session", session);
  return true;
}

export function endSession() {
  console.log("[session] endSession");

  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getSessionUser(): string | null {
  return getSession()?.userId || null;
}

export function getSessionId(): string | null {
  return getSession()?.sessionId || null;
}
