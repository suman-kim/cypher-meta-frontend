import { forward } from "@/lib/proxy";

/** 공개 업데이트 노트 목록 프록시 — /api/updates → 백엔드 /updates */
export async function GET(req: Request) {
  const { search } = new URL(req.url);
  return forward(`/updates${search}`, "GET");
}

export const dynamic = "force-dynamic";
