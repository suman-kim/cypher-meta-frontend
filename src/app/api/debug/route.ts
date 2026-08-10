import { NextRequest, NextResponse } from "next/server";

/**
 * 개발용 디버그 라우트 — Neople API 의 "원시 JSON"을 그대로 확인합니다.
 *
 * 사용법 (개발 서버에서):
 *   http://localhost:3000/api/debug?path=/matches/<matchId>
 *   http://localhost:3000/api/debug?path=/players/<playerId>/matches&gameTypeId=normal
 *   http://localhost:3000/api/debug?path=/players/<playerId>
 *
 * - apikey 는 서버에서만 붙으므로 브라우저 URL 에 키가 노출되지 않습니다.
 * - `path` 외의 쿼리 파라미터는 그대로 업스트림으로 전달됩니다.
 * - 프로덕션(NODE_ENV=production)에서는 비활성화됩니다.
 */
export const runtime = "edge";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "debug 라우트는 프로덕션에서 비활성화됩니다." }, { status: 403 });
  }

  const path = req.nextUrl.searchParams.get("path");
  if (!path || !path.startsWith("/")) {
    return NextResponse.json(
      { error: "path 파라미터가 필요합니다. 예: /api/debug?path=/matches/<matchId>" },
      { status: 400 },
    );
  }

  const key = process.env.NEOPLE_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "NEOPLE_API_KEY 가 설정되지 않았습니다." }, { status: 500 });
  }

  const url = new URL("https://api.neople.co.kr/cy" + path);
  // path 를 제외한 모든 쿼리 파라미터를 업스트림으로 전달
  req.nextUrl.searchParams.forEach((value, k) => {
    if (k !== "path") url.searchParams.set(k, value);
  });
  url.searchParams.set("apikey", key);

  try {
    const r = await fetch(url.toString(), { cache: "no-store", headers: { Accept: "application/json" } });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "업스트림 요청 실패", detail: (e as Error).message },
      { status: 502 },
    );
  }
}
