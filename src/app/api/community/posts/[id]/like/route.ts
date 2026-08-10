import { forward } from "@/lib/proxy";

export const runtime = "edge";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  return forward(`/community/posts/${encodeURIComponent(params.id)}/like`, "POST");
}
