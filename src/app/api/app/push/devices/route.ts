/**
 * POST /api/app/push/devices — 앱 기기(FCM 토큰) 등록을 백엔드 /push/devices 로 중계한다.
 * 본문: { installId, token, platform } — 검증은 백엔드 DTO 가 맡는다.
 */
import { forward } from "@/lib/proxy";

/**
 * @param req 요청 (JSON 본문)
 */
export async function POST(req: Request) {
  return forward("/push/devices", "POST", await req.text());
}
