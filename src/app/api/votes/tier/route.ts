import { NextRequest } from "next/server";
import { proxyWithVisitor } from "@/lib/vote-proxy";

export const runtime = "edge";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return proxyWithVisitor(req, "/votes/tier", "POST");
}
export function GET(req: NextRequest) {
  return proxyWithVisitor(req, "/votes/tier/mine", "GET");
}
