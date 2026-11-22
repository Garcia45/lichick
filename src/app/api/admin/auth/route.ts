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

function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp || "local";
}

function isHttpsRequest(req: NextRequest): boolean {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
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
    const clientKey = getClientKey(req);
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
      const fail = recordFailedLogin(clientKey);
      if (fail.locked) {
        return NextResponse.json(
          {
            ok: false,
            error: `Akses dikunci sementara selama ${fail.retryAfterMinutes} menit karena terlalu banyak percobaan salah.`,
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
