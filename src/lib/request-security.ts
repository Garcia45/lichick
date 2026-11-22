import type { NextRequest } from "next/server";

interface WindowBucket {
  timestamps: number[];
}

const globalForLimiter = globalThis as unknown as {
  __lichickRateBuckets?: Map<string, WindowBucket>;
};

function getBuckets(): Map<string, WindowBucket> {
  if (!globalForLimiter.__lichickRateBuckets) {
    globalForLimiter.__lichickRateBuckets = new Map();
  }
  return globalForLimiter.__lichickRateBuckets;
}

export function getTrustedClientIp(req: NextRequest): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp;

  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  return "local";
}

/**
 * Validasi Same-Origin (proteksi CSRF untuk endpoint mutasi).
 * Mengizinkan request dari origin/host yang sama (atau tanpa header Origin untuk client non-browser lokal).
 */
export function verifySameOrigin(req: NextRequest): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "same-site" && secFetchSite !== "none") {
    return false;
  }

  const origin = req.headers.get("origin");
  if (!origin) return true;

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return false;

  try {
    const originHost = new URL(origin).host.toLowerCase();
    return originHost === host.toLowerCase();
  } catch {
    return false;
  }
}

export function checkSlidingRateLimit(params: {
  bucket: string;
  key: string;
  maxRequests: number;
  windowMs: number;
}): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const map = getBuckets();
  const now = Date.now();
  const fullKey = `${params.bucket}:${params.key}`;

  // Bersihkan entri kadaluarsa sesekali agar memori tetap kecil
  if (map.size > 2000) {
    for (const [k, v] of map.entries()) {
      const latest = v.timestamps[v.timestamps.length - 1] || 0;
      if (now - latest > 30 * 60 * 1000) {
        map.delete(k);
      }
    }
  }

  const current = map.get(fullKey) || { timestamps: [] };
  const valid = current.timestamps.filter((t) => now - t < params.windowMs);

  if (valid.length >= params.maxRequests) {
    const oldest = valid[0] || now;
    const retryMs = Math.max(1000, params.windowMs - (now - oldest));
    map.set(fullKey, { timestamps: valid });
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryMs / 1000),
      remaining: 0,
    };
  }

  valid.push(now);
  map.set(fullKey, { timestamps: valid });
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, params.maxRequests - valid.length),
  };
}

export function maskWhatsappNumber(raw: string): string {
  const clean = String(raw || "").trim();
  if (!clean || clean === "-") return "-";
  if (clean.length <= 6) return "****";
  return `${clean.slice(0, 4)}****${clean.slice(-3)}`;
}

export function maskDeliveryAddress(raw: string): string {
  const clean = String(raw || "").trim();
  if (!clean || clean === "-") return "-";
  if (clean.length <= 20) return clean;
  return `${clean.slice(0, 18)}...`;
}
