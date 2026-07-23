import { NextResponse } from "next/server";
import { getMatch } from "@/lib/neople";

/** 매치 상세(정규화) — 최근 전적 행 펼침 요약용 */
export async function GET(_req: Request, { params }: { params: { matchId: string } }) {
  try {
    const detail = await getMatch(params.matchId);
    return NextResponse.json(detail);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 502 });
  }
}
