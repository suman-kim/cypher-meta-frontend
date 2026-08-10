import { NextRequest, NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 캐릭터 픽 표본 기록 — 캐릭터 티어 드릴다운용(클라이언트 fetch). 수집분은 하루 단위라 5분 캐시. */
export const runtime = "edge";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(
      `${API}/meta/characters/${encodeURIComponent(params.id)}/picks${req.nextUrl.search}`,
      { next: { revalidate: 300 } },
    );
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
