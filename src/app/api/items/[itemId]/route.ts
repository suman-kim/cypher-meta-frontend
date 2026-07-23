import { NextResponse } from "next/server";
import { getItem } from "@/lib/neople";

/** 아이템 상세(설명·효과) — 매치 상세 아이템 호버 툴팁의 지연 로딩용 */
export async function GET(_req: Request, { params }: { params: { itemId: string } }) {
  try {
    const item = await getItem(params.itemId);
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
