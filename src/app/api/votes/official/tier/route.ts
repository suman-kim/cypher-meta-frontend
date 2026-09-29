/**
 * 공식 역할군 티어 투표 프록시 — 방문자 쿠키(cy_vid)로 visitorId 를 붙여 백엔드로 중계한다.
 *  - POST: 내 투표 저장 → POST /votes/official/tier
 *  - GET : 내 투표 조회 → GET  /votes/official/tier/mine
 */
import { NextRequest } from "next/server";
import { proxyWithVisitor } from "@/lib/vote-proxy";

export const dynamic = "force-dynamic";

/** 내 공식 티어 투표 저장 */
export function POST(req: NextRequest) {
  return proxyWithVisitor(req, "/votes/official/tier", "POST");
}
/** 내 공식 티어 투표 조회 */
export function GET(req: NextRequest) {
  return proxyWithVisitor(req, "/votes/official/tier/mine", "GET");
}
