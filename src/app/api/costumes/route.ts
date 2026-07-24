import { NextRequest, NextResponse } from "next/server";

/** 공개 코스튬 목록 프록시 — 클라이언트(관리자 매니저 등)가 백엔드 costumes API 를 동일 출처로 호출. */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search; // ?character=&year= 그대로 전달
  try {
    const r = await fetch(`${API}/costumes${qs}`, { cache: "no-store" });
    const text = await r.text();
    return new NextResponse(text || "[]", {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "백엔드 서버(:4000)에 연결할 수 없습니다." }, { status: 502 });
  }
}
