import { NextResponse } from "next/server";
import { getItem } from "@/lib/neople";

/** 아이템 상세(설명·효과) — 호버 툴팁 지연 로딩용. 사실상 불변이라 CDN에 길게 캐시. */
export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: { itemId: string } }) {
  try {
    const item = await getItem(params.itemId);
    return NextResponse.json(item, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
