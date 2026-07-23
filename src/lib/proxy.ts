import { NextResponse } from "next/server";

/**
 * 프론트 라우트 핸들러(app/api/community/*)에서 백엔드(NestJS)로 요청을 프록시.
 * 백엔드 주소(CYPHERS_API_URL)를 서버 측에만 두어 브라우저에 노출하지 않고,
 * 동일 출처(same-origin) 호출로 CORS 이슈도 피합니다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export async function forward(
  path: string,
  method: string,
  body?: string,
): Promise<NextResponse> {
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text || "{}", {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return NextResponse.json(
      { message: `백엔드 서버(:4000)에 연결할 수 없습니다. (${(e as Error).message})` },
      { status: 502 },
    );
  }
}
