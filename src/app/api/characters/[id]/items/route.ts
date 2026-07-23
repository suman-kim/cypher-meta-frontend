import { NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const dynamic = "force-dynamic";

/** 캐릭터 부위별 채택 아이템 — 아이템 탐색 UI 의 캐릭터 전환용(클라이언트 fetch). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${API}/meta/characters/${encodeURIComponent(params.id)}/items`, {
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
