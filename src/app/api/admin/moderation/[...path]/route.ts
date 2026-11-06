/**
 * 관리자 신고 프록시 — /api/admin/moderation/<x> → 백엔드 /moderation/admin/<x> (x-admin-token 전달).
 *  - GET  /api/admin/moderation/reports?view=pending|handled&page=
 *  - POST /api/admin/moderation/reports/resolve
 */
import { NextRequest, NextResponse } from "next/server";

/** 백엔드 주소(서버 전용) */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

/**
 * 백엔드로 중계한다.
 * @param req — 들어온 요청(헤더의 관리자 토큰·쿼리·본문을 넘긴다)
 * @param path — /api/admin/moderation/ 뒤의 경로 조각
 * @returns 백엔드 응답(JSON)
 */
async function forward(req: NextRequest, path: string[]) {
  const token = req.headers.get("x-admin-token") ?? "";
  const url = `${API}/moderation/admin/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const init: RequestInit = {
    method: req.method,
    headers: { "x-admin-token": token, "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.text();
    if (body) init.body = body;
  }
  try {
    const r = await fetch(url, init);
    const text = await r.text();
    return new NextResponse(text || "{}", { status: r.status, headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ message: "백엔드에 연결할 수 없습니다." }, { status: 502 });
  }
}

/** 목록 조회 */
export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}
/** 처리 */
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}
export const dynamic = "force-dynamic";
