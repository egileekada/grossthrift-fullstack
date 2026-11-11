export const DEFAULT_SITE_URL = 'https://grossthrift-fullstack.vercel.app';

function normalizeOrigin(raw?: string | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const isLocal = /^(localhost|127\.0\.0\.1)(:|\/|$)/i.test(trimmed);
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${isLocal ? 'http' : 'https'}://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/**
 * Resolves the origin of the incoming HTTP request, honoring proxy headers.
 */
export function getRequestOrigin(request?: Request): string {
  if (!request) return DEFAULT_SITE_URL;

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https';
  if (forwardedHost) {
    const forwardedOrigin = normalizeOrigin(`${forwardedProto}://${forwardedHost}`);
    if (forwardedOrigin) return forwardedOrigin;
  }

  try {
    return new URL(request.url).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

/**
 * Resolves the canonical public site origin used in auth redirects, invites,
 * and transactional emails, preferring configured production URLs over localhost.
 */
export function getSiteUrl(request?: Request): string {
  const configured =
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeOrigin(process.env.SITE_URL) ||
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (configured) return configured;

  if (request) {
    const reqOrigin = getRequestOrigin(request);
    if (!isLocalOrigin(reqOrigin)) {
      return reqOrigin;
    }
  }

  const vercelUrl = normalizeOrigin(process.env.VERCEL_URL);
  if (vercelUrl) return vercelUrl;

  return request ? getRequestOrigin(request) : DEFAULT_SITE_URL;
}

/**
 * Builds the verification callback URL pointing at our own /auth/callback route
 * when a hashed OTP token is available, falling back to Supabase's action link.
 */
export function buildAuthCallbackUrl(input: {
  origin: string;
  hashedToken?: string;
  verificationType?: string;
  fallbackActionLink?: string;
  nextPath: string;
}): string {
  if (input.hashedToken && input.verificationType) {
    const url = new URL('/auth/callback', input.origin);
    url.searchParams.set('token_hash', input.hashedToken);
    url.searchParams.set('type', input.verificationType);
    url.searchParams.set('next', input.nextPath);
    return url.toString();
  }
  return input.fallbackActionLink || new URL(input.nextPath, input.origin).toString();
}

