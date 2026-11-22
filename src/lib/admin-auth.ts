import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "lichick_admin_session";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 15 * 60 * 1000; // 15 menit

interface RateLimitEntry {
  count: number;
  lockedUntil: number;
  lastAttempt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __lichickAdminRateLimit?: Map<string, RateLimitEntry>;
};

function getRateLimitMap(): Map<string, RateLimitEntry> {
  if (!globalForRateLimit.__lichickAdminRateLimit) {
    globalForRateLimit.__lichickAdminRateLimit = new Map();
  }
  return globalForRateLimit.__lichickAdminRateLimit;
}

function sha256Buffer(value: string): Buffer {
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

export function getAdminSecretSlug(): string {
  const raw = (process.env.ADMIN_SECRET_SLUG || "dapur-lucuih-26").trim();
  const cleaned = raw.replace(/^\/+|\/+$/g, "");
  return cleaned || "dapur-lucuih-26";
}

export function getAdminPortalPath(): string {
  return `/portal/${getAdminSecretSlug()}`;
}

export function verifyAdminSlug(providedSlug: string): boolean {
  const expected = getAdminSecretSlug();
  const provided = String(providedSlug || "").trim();
  if (!provided) return false;
  return crypto.timingSafeEqual(sha256Buffer(provided), sha256Buffer(expected));
}

export function hashAdminSecret(plainSecret: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plainSecret, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

function verifyScryptHash(input: string, storedHash: string): boolean {
  const sep = storedHash.includes(":") ? ":" : "$";
  const parts = storedHash.split(sep);
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hexKey] = parts;
  if (!salt || !hexKey) return false;

  try {
    const expectedBuf = Buffer.from(hexKey, "hex");
    const derivedBuf = crypto.scryptSync(input, salt, expectedBuf.length);
    if (derivedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(derivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

export function verifyAdminSecret(inputSecret: string): boolean {
  const provided = String(inputSecret || "").trim();
  if (!provided) return false;

  const passwordHash = (process.env.ADMIN_PASSWORD_HASH || "").trim();
  if (passwordHash) {
    return verifyScryptHash(provided, passwordHash);
  }

  const fallbackPin = (process.env.ADMIN_PIN || "123456").trim();
  return crypto.timingSafeEqual(
    sha256Buffer(provided),
    sha256Buffer(fallbackPin)
  );
}

export function checkLoginRateLimit(clientKey: string): {
  allowed: boolean;
  retryAfterMinutes: number;
  remainingAttempts: number;
} {
  const map = getRateLimitMap();
  const now = Date.now();
  const entry = map.get(clientKey);

  if (!entry) {
    return {
      allowed: true,
      retryAfterMinutes: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
    };
  }

  if (entry.lockedUntil > now) {
    const remainingMs = entry.lockedUntil - now;
    return {
      allowed: false,
      retryAfterMinutes: Math.max(1, Math.ceil(remainingMs / 60000)),
      remainingAttempts: 0,
    };
  }

  if (now - entry.lastAttempt > LOCK_WINDOW_MS) {
    map.delete(clientKey);
    return {
      allowed: true,
      retryAfterMinutes: 0,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
    };
  }

  return {
    allowed: true,
    retryAfterMinutes: 0,
    remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - entry.count),
  };
}

export function recordFailedLogin(clientKey: string): {
  locked: boolean;
  remainingAttempts: number;
  retryAfterMinutes: number;
} {
  const map = getRateLimitMap();
  const now = Date.now();
  const prev = map.get(clientKey);

  const count =
    prev && now - prev.lastAttempt <= LOCK_WINDOW_MS ? prev.count + 1 : 1;

  if (count >= MAX_FAILED_ATTEMPTS) {
    map.set(clientKey, {
      count,
      lockedUntil: now + LOCK_WINDOW_MS,
      lastAttempt: now,
    });
    return {
      locked: true,
      remainingAttempts: 0,
      retryAfterMinutes: Math.ceil(LOCK_WINDOW_MS / 60000),
    };
  }

  map.set(clientKey, {
    count,
    lockedUntil: 0,
    lastAttempt: now,
  });

  return {
    locked: false,
    remainingAttempts: MAX_FAILED_ATTEMPTS - count,
    retryAfterMinutes: 0,
  };
}

export function clearFailedLogins(clientKey: string): void {
  getRateLimitMap().delete(clientKey);
}

function getSessionSecret(): string {
  const explicit = (process.env.ADMIN_SESSION_SECRET || "").trim();
  if (explicit) return explicit;
  const seed =
    process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PIN || "lichick-local";
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function signToken(payload: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("hex");
}

export function createSessionValue(): string {
  const issuedAt = String(Date.now());
  const sig = signToken(issuedAt);
  return `${issuedAt}.${sig}`;
}

export function verifySessionValue(cookieVal: string | undefined): boolean {
  if (!cookieVal) return false;
  const parts = cookieVal.split(".");
  if (parts.length !== 2) return false;
  const [issuedAt, providedSig] = parts;
  if (!issuedAt || !providedSig) return false;

  const ageMs = Date.now() - Number(issuedAt);
  const maxAgeMs = 1000 * 60 * 60 * 24 * 7; // 7 hari
  if (Number.isNaN(ageMs) || ageMs < 0 || ageMs > maxAgeMs) return false;

  const expectedSig = signToken(issuedAt);
  if (providedSig.length !== expectedSig.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(providedSig),
    Buffer.from(expectedSig)
  );
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifySessionValue(value);
}
