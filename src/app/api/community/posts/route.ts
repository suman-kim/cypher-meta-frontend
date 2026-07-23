import { forward } from "@/lib/proxy";

export async function POST(req: Request) {
  const body = await req.text();
  return forward("/community/posts", "POST", body);
}
