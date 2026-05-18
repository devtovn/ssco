const SESSION_KEY = 'ssco_session';

export function getUserSession(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  let session = localStorage.getItem(SESSION_KEY);
  if (!session) {
    session =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, session);
  }
  return session;
}
