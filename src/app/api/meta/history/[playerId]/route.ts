import { NextRequest, NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";
export const dynamic = "force-dynamic";

/** 개인 히스토리 분석 요약 프록시(클라이언트 fetch). 백엔드 GET /meta/history/:playerId 위임. */
export async function GET(req: NextRequest, { params }: { params: { playerId: string } }) {
  try {
    const res = await fetch(`${API}/meta/history/${encodeURIComponent(params.playerId)}${req.nextUrl.search}`, {
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
