import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 방문자 쿠키(cy_vid)를 읽어 visitorId 를 부여하고 백엔드 투표 API 로 프록시. */
export async function proxyWithVisitor(
  req: NextRequest,
  backendPath: string,
  method: "GET" | "POST",
): Promise<NextResponse> {
  let vid = req.cookies.get("cy_vid")?.value;
  const isNew = !vid;
  if (!vid) vid = randomUUID();

  let url = `${API}${backendPath}`;
  const init: RequestInit = { method, cache: "no-store" };
  if (method === "POST") {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      /* 빈 바디 허용 */
    }
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify({ ...body, visitorId: vid });
  } else {
    url += (url.includes("?") ? "&" : "?") + "visitorId=" + encodeURIComponent(vid);
  }

  let status = 200;
  let text = "{}";
  try {
    const r = await fetch(url, init);
    status = r.status;
    text = (await r.text()) || "{}";
  } catch (e) {
    return NextResponse.json(
      { message: `백엔드 서버에 연결할 수 없습니다. (${(e as Error).message})` },
      { status: 502 },
    );
  }

  const res = new NextResponse(text, {
    status,
    headers: { "Content-Type": "application/json" },
  });
  if (isNew) {
    res.cookies.set("cy_vid", vid, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
