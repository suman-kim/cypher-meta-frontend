import { NextRequest, NextResponse } from "next/server";

/** 관리자 수집 설정 프록시 — /api/admin/collect/config → 백엔드 /meta/collect/config (x-admin-token 전달) */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

async function proxy(req: NextRequest, method: "GET" | "POST") {
  const token = req.headers.get("x-admin-token") ?? "";
  const body = method === "POST" ? await req.text() : undefined;
  try {
    const r = await fetch(`${API}/meta/collect/config`, {
      method,
      headers: {
        "x-admin-token": token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
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

export async function GET(req: NextRequest) {
  return proxy(req, "GET");
}
export async function POST(req: NextRequest) {
  return proxy(req, "POST");
}
