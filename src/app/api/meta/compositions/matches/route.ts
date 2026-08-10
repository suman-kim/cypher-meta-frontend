import { NextRequest, NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 조합이 등장한 표본 매치 목록 — 조합 티어 드릴다운용(클라이언트 fetch). 5분 캐시. */
export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${API}/meta/compositions/matches${req.nextUrl.search}`, {
      next: { revalidate: 300 },
    });
    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
