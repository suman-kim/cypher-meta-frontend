import { NextRequest, NextResponse } from "next/server";

/** 코스튬 피드백 삭제 프록시 → 백엔드 DELETE /costumes/feedback/:fid
 *  본인 비밀번호(body.password) 또는 관리자(x-admin-token 헤더)로 삭제. */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { fid: string } }) {
  const token = req.headers.get("x-admin-token") ?? "";
  const body = await req.text();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["x-admin-token"] = token;
  try {
    const r = await fetch(`${API}/costumes/feedback/${encodeURIComponent(params.fid)}`, {
      method: "DELETE",
      headers,
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
