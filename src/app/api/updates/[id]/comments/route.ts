import { forward } from "@/lib/proxy";

/** 댓글 목록 프록시 — GET /api/updates/:id/comments → 백엔드 /updates/:id/comments */
export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return forward(`/updates/${encodeURIComponent(params.id)}/comments`, "GET");
}

/** 비회원 댓글 작성 프록시 — POST /api/updates/:id/comments */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return forward(`/updates/${encodeURIComponent(params.id)}/comments`, "POST", body);
}

export const dynamic = "force-dynamic";
