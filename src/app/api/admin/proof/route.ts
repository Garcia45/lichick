import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const DRIVE_FILE_ID_REGEX = /^[A-Za-z0-9_-]{10,100}$/;

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const fileId = (req.nextUrl.searchParams.get("id") || "").trim();
  if (!DRIVE_FILE_ID_REGEX.test(fileId)) {
    return NextResponse.json(
      { ok: false, error: "ID file bukti pembayaran tidak valid." },
      { status: 400 }
    );
  }

  // Ambil gambar bukti bayar di sisi server (bebas blokir cookie/CORB browser & aman dari SSRF)
  const candidates = [
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w1200`,
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`,
  ];

  for (const upstreamUrl of candidates) {
    try {
      const upstream = await fetch(upstreamUrl, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        cache: "no-store",
      });

      const contentType = upstream.headers.get("content-type") || "";
      if (upstream.ok && contentType.toLowerCase().startsWith("image/")) {
        const buffer = await upstream.arrayBuffer();
        if (buffer.byteLength > 0) {
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "private, max-age=300",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }
      }
    } catch {
      // Coba kandidat URL berikutnya
    }
  }

  return NextResponse.json(
    { ok: false, error: "Foto bukti pembayaran tidak dapat dimuat dari Google Drive." },
    { status: 502 }
  );
}
