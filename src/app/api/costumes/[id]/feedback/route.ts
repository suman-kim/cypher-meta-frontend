import { NextRequest, NextResponse } from "next/server";

/** 코스튬 피드백 조회(GET) / 작성(POST) 프록시 → 백엔드 /costumes/:id/feedback */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const r = await fetch(`${API}/costumes/${encodeURIComponent(params.id)}/feedback`, {
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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.text();
  try {
    const r = await fetch(`${API}/costumes/${encodeURIComponent(params.id)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
