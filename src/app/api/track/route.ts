import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 클라이언트 방문 이벤트 수신 → IP·geo·UA 를 채워 백엔드로 전달. 익명 방문자 쿠키 발급. */
export async function POST(req: NextRequest) {
  let body: { path?: string; event?: string; referrer?: string; query?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* 빈 바디 허용 */
  }

  const h = req.headers;
  const xff = h.get("x-forwarded-for") ?? "";
  const ip = (xff.split(",")[0] || h.get("x-real-ip") || "").trim();
  const country = h.get("x-vercel-ip-country") ?? "";
  let city = h.get("x-vercel-ip-city") ?? "";
  try {
    city = decodeURIComponent(city);
  } catch {
    /* 원본 유지 */
  }
  const userAgent = h.get("user-agent") ?? "";

  let visitorId = req.cookies.get("cy_vid")?.value;
  const isNew = !visitorId;
  if (!visitorId) visitorId = randomUUID();

  const payload = {
    path: typeof body.path === "string" && body.path ? body.path : "/",
    event: typeof body.event === "string" && body.event ? body.event : "pageview",
    referrer: typeof body.referrer === "string" ? body.referrer : undefined,
    query: typeof body.query === "string" ? body.query : undefined,
    visitorId,
    ip,
    country,
    city,
    userAgent,
  };

  try {
    await fetch(`${API}/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    /* 트래킹 실패는 무시 */
  }

  const res = NextResponse.json({ ok: true });
  if (isNew) {
    res.cookies.set("cy_vid", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
