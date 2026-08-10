import { forward } from "@/lib/proxy";

/** 비회원 댓글 삭제 프록시 — POST /api/updates/comments/:cid/delete */
export async function POST(req: Request, { params }: { params: { cid: string } }) {
  const body = await req.text();
  return forward(`/updates/comments/${encodeURIComponent(params.cid)}/delete`, "POST", body);
}

export const dynamic = "force-dynamic";
