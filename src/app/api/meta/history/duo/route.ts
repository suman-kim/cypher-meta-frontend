import { NextRequest } from "next/server";
import { forward } from "@/lib/proxy";

export const dynamic = "force-dynamic";

/**
 * 플레이어 2명 비교 프록시 — 백엔드 GET /meta/history/duo 로 쿼리(a, b, gameType, an, bn)를 그대로 중계한다.
 * @param req — 요청(쿼리스트링 포함)
 * @returns 백엔드 응답(JSON)
 */
export async function GET(req: NextRequest) {
  return forward(`/meta/history/duo${req.nextUrl.search}`, "GET");
}
