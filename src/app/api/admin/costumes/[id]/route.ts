import { NextRequest, NextResponse } from "next/server";

/** 코스튬 1건 삭제 프록시(관리자) — x-admin-token 을 백엔드로 전달. */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get("x-admin-token") ?? "";
  try {
    const r = await fetch(`${API}/costumes/${encodeURIComponent(params.id)}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
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
