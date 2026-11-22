import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  checkLoginRateLimit,
  clearFailedLogins,
  createSessionValue,
  getAdminPortalPath,
  isAdminAuthenticated,
  recordFailedLogin,
  verifyAdminSecret,
} from "@/lib/admin-auth";
import {
  checkSlidingRateLimit,
  getTrustedClientIp,
  verifySameOrigin,
} from "@/lib/request-security";

function isHttpsRequest(req: NextRequest): boolean {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
    });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    portalPath: getAdminPortalPath(),
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!verifySameOrigin(req)) {
      return NextResponse.json(
        { ok: false, error: "Origin permintaan tidak diizinkan." },
        { status: 403 }
      );
    }

    const clientKey = getTrustedClientIp(req);
    const limit = checkLoginRateLimit(clientKey);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${limit.retryAfterMinutes} menit.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const secret = String(body.password ?? body.pin ?? "");

    if (!verifyAdminSecret(secret)) {
      // Perlambat respon gagal & batasi percobaan gagal global (tahan serangan brute-force lintas IP)
      const globalFailLimit = checkSlidingRateLimit({
        bucket: "admin_auth_global_fail",
        key: "all",
        maxRequests: 20,
        windowMs: 15 * 60 * 1000,
      });
      await delay(450);

      const fail = recordFailedLogin(clientKey);
      if (fail.locked || !globalFailLimit.allowed) {
        return NextResponse.json(
          {
            ok: false,
            error: `Akses dikunci sementara selama ${Math.max(
              fail.retryAfterMinutes,
              Math.ceil(globalFailLimit.retryAfterSeconds / 60)
            )} menit karena terlalu banyak percobaan salah.`,
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: `Password / PIN salah. Sisa percobaan: ${fail.remainingAttempts}.`,
        },
        { status: 401 }
      );
    }

    clearFailedLogins(clientKey);

    const res = NextResponse.json({
      ok: true,
      authenticated: true,
      portalPath: getAdminPortalPath(),
    });
    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: createSessionValue(),
      httpOnly: true,
      sameSite: "lax",
      secure: isHttpsRequest(req),
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Format login tidak valid." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!verifySameOrigin(req)) {
    return NextResponse.json(
      { ok: false, error: "Origin permintaan tidak diizinkan." },
      { status: 403 }
    );
  }

  const res = NextResponse.json({ ok: true, authenticated: false });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttpsRequest(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}
