/**
 * PUT /api/app/push/subscriptions — 기기의 알림 구독 대상(플레이어·방송 채널)을 백엔드에 전체 교체로 중계한다.
 * 본문: { installId, players: [{ playerId, nickname }], lives: [{ platform, channelId, channelName }] }
 */
import { forward } from "@/lib/proxy";

/**
 * @param req 요청 (JSON 본문)
 */
export async function PUT(req: Request) {
  return forward("/push/subscriptions", "PUT", await req.text());
}
