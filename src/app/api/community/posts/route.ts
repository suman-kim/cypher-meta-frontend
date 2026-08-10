import { forward } from "@/lib/proxy";

export const runtime = "edge";

export async function POST(req: Request) {
  const body = await req.text();
  return forward("/community/posts", "POST", body);
}
