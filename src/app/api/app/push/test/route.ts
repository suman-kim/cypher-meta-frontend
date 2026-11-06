/**
 * POST /api/app/push/test — 이 기기로 테스트 알림 1건을 보내 달라고 백엔드에 중계한다(같은 기기 60초에 1번).
 * 본문: { installId }
 */
import { forward } from "@/lib/proxy";

/**
 * @param req 요청 (JSON 본문)
 */
export async function POST(req: Request) {
  return forward("/push/test", "POST", await req.text());
}
