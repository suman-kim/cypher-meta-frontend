import { NextRequest, NextResponse } from "next/server";

/**
 * 치지직 라이브 HLS 재생주소 프록시 — 클라이언트(카드 호버 미리보기)가 백엔드를 동일 출처로 호출.
 * 백엔드가 live-detail 의 livePlaybackJson 을 파싱해 m3u8 을 내려준다.
 */
const API = process.env.CYPHERS_API_URL ?? "http://localhost:4000/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get("channelId") ?? "";
  try {
    const r = await fetch(`${API}/chzzk/live-url?channelId=${encodeURIComponent(channelId)}`, {
      cache: "no-store",
    });
    const text = await r.text();
    return new NextResponse(text || '{"url":null}', {
      status: r.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json({ channelId, url: null }, { status: 502 });
  }
}
