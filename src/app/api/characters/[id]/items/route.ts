import { NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/** 캐릭터 부위별 채택 아이템 — 캐릭터 전환용(클라이언트 fetch). 느리게 변하므로 CDN 캐시. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${API}/meta/characters/${encodeURIComponent(params.id)}/items`, {
      next: { revalidate: 3600 },
    });
    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
