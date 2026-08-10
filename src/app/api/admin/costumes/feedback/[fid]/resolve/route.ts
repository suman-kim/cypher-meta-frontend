import { NextRequest, NextResponse } from "next/server";

/** 수정요청 상태 변경 프록시(관리자) → 백엔드 POST /costumes/feedback/:fid/resolve */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const runtime = "edge";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { fid: string } }) {
  const token = req.headers.get("x-admin-token") ?? "";
  const body = await req.text();
  try {
    const r = await fetch(`${API}/costumes/feedback/${encodeURIComponent(params.fid)}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: body || "{}",
      cache: "no-store",
    });
    const text = await r.text();
    return new NextResponse(text || "{}", {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "백엔드 서버(:4000)에 연결할 수 없습니다." }, { status: 502 });
  }
}
