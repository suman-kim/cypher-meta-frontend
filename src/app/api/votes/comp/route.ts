import { NextRequest } from "next/server";
import { proxyWithVisitor } from "@/lib/vote-proxy";

export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return proxyWithVisitor(req, "/votes/comp", "POST");
}
export function GET(req: NextRequest) {
  return proxyWithVisitor(req, "/votes/comp/mine", "GET");
}
