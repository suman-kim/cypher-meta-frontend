/**
 * POST /api/moderation/reports — 글·댓글 신고를 백엔드(/moderation/reports)로 중계한다.
 */
import { forward } from "@/lib/proxy";

/**
 * 신고 넣기.
 * @param req — 본문 { targetType, targetId, reason, detail?, reporterKey }
 * @returns 백엔드 응답 그대로
 */
export async function POST(req: Request) {
  const body = await req.text();
  return forward("/moderation/reports", "POST", body);
}
