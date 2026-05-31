const SESSION_KEY = 'ssco_session';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Generate a 26-char ULID (Crockford base32). */
function generateUlid(): string {
  const ts = Date.now();
  let result = '';

  // 10 timestamp chars (48-bit ms, big-endian, 5 bits per char)
  for (let i = 9; i >= 0; i--) {
    result = CROCKFORD[Math.floor(ts / 2 ** (i * 5)) & 31] + result;
  }

  // 16 random chars
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const bits = Array.from(rand).reduce((acc, b) => acc + b.toString(2).padStart(8, '0'), '');
  for (let i = 0; i < 16; i++) {
    result += CROCKFORD[parseInt(bits.slice(i * 5, i * 5 + 5), 2)];
  }

  return result;
}

export function getUserSession(): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  let session = localStorage.getItem(SESSION_KEY);
  if (!session) {
    session = generateUlid();
    localStorage.setItem(SESSION_KEY, session);
  }
  return session;
}
