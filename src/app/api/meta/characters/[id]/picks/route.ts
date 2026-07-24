import { NextRequest, NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";
export const dynamic = "force-dynamic";

/** 캐릭터 픽 표본 기록(누가·어떤 경기) — 캐릭터 티어 드릴다운용(클라이언트 fetch). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(
      `${API}/meta/characters/${encodeURIComponent(params.id)}/picks${req.nextUrl.search}`,
      { cache: "no-store" },
    );
    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
