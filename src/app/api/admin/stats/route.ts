import { NextRequest, NextResponse } from "next/server";

const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export async function GET(req: NextRequest) {
  const token = req.headers.get("x-admin-token") ?? "";
  const days = req.nextUrl.searchParams.get("days") ?? "30";
  try {
    const r = await fetch(`${API}/analytics/admin/stats?days=${encodeURIComponent(days)}`, {
      headers: { "x-admin-token": token },
      cache: "no-store",
    });
    const text = await r.text();
    return new NextResponse(text || "{}", {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "백엔드에 연결할 수 없습니다." }, { status: 502 });
  }
}
