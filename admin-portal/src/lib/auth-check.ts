import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'abc_admin_session';

function getSessionSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PIN ||
    'abc-national-admin-default-secure-secret-key'
  );
}

/**
 * Creates a signed session token: <timestamp>.<hmac>
 */
export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const secret = getSessionSecret();
  const hmac = crypto.createHmac('sha256', secret).update(timestamp).digest('hex');
  return `${timestamp}.${hmac}`;
}

/**
 * Verifies a signed session token. Valid for 7 days.
 */
export function isValidSessionToken(token?: string | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, providedHmac] = parts;
  const timestamp = Number(timestampStr);
  if (isNaN(timestamp)) return false;

  // Max session age: 7 days
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAgeMs) {
    return false;
  }

  const secret = getSessionSecret();
  const expectedHmac = crypto.createHmac('sha256', secret).update(timestampStr).digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Validates the current admin session from request cookies.
 */
export async function isAuthenticatedAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return isValidSessionToken(sessionCookie);
}

export { SESSION_COOKIE_NAME };
