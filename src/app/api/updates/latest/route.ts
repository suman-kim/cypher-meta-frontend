import { forward } from "@/lib/proxy";

/** 최신 발행 업데이트 1건 프록시 — /api/updates/latest → 백엔드 /updates/latest */
export async function GET() {
  return forward(`/updates/latest`, "GET");
}

export const dynamic = "force-dynamic";
