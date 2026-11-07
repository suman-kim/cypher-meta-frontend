/**
 * 관리자 통계·로그 프록시 — /api/admin/analytics/<x> → 백엔드 /analytics/admin/<x> (x-admin-token 전달, 조회만).
 *  - GET /api/admin/analytics/daily?days=          일별 표
 *  - GET /api/admin/analytics/day?date=            하루 상세
 *  - GET /api/admin/analytics/logs?…               방문 로그
 *  - GET /api/admin/analytics/visitor?visitorId=   방문자 요약
 *  - GET /api/admin/analytics/activity?…           사이트 활동 목록
 *  - GET /api/admin/analytics/activity/summary?days= 사이트 활동 하루별 요약
 */
import { NextRequest, NextResponse } from "next/server";

/** 백엔드 주소(서버 전용) */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/**
 * 백엔드로 중계한다.
 * @param req — 들어온 요청(헤더의 관리자 토큰·쿼리를 넘긴다)
 * @param params.path — /api/admin/analytics/ 뒤의 경로 조각
 * @returns 백엔드 응답(JSON)
 */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const token = req.headers.get("x-admin-token") ?? "";
  const url = `${API}/analytics/admin/${params.path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  try {
    const r = await fetch(url, { headers: { "x-admin-token": token }, cache: "no-store" });
    const text = await r.text();
    return new NextResponse(text || "{}", { status: r.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ message: "백엔드에 연결할 수 없습니다." }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
