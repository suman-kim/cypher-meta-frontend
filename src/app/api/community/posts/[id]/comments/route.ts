import { forward } from "@/lib/proxy";

export const runtime = "edge";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.text();
  return forward(`/community/posts/${encodeURIComponent(params.id)}/comments`, "POST", body);
}
