import { NextRequest, NextResponse } from "next/server";

/** 관리자 수집 이력 프록시 — /api/admin/collect/runs → 백엔드 /meta/collect/runs (x-admin-token 전달) */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-admin-token") ?? "";
  const limit = req.nextUrl.searchParams.get("limit") ?? "30";
  try {
    const r = await fetch(`${API}/meta/collect/runs?limit=${encodeURIComponent(limit)}`, {
      headers: { "x-admin-token": token },
      cache: "no-store",
    });
    const text = await r.text();
    return new NextResponse(text || "[]", {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "백엔드에 연결할 수 없습니다." }, { status: 502 });
  }
}
