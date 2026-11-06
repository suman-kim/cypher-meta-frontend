/**
 * DELETE /api/app/push/devices/:installId — 이 기기의 알림 등록·구독을 지우도록 백엔드에 중계한다.
 */
import { forward } from "@/lib/proxy";

/**
 * @param _req 요청 (본문 없음)
 * @param params.installId 기기 설치 ID (UUID)
 */
export async function DELETE(_req: Request, { params }: { params: { installId: string } }) {
  return forward(`/push/devices/${encodeURIComponent(params.installId)}`, "DELETE");
}
