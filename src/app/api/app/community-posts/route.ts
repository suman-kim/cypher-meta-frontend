/**
 * 앱 커뮤니티 목록 이어 불러오기 — GET /api/app/community-posts?board=rating&page=2&pageSize=20&q=검색어
 *
 * 웹 목록은 번호 페이지(서버 렌더)라 목록 조회용 프록시 라우트가 없다.
 * 앱은 끝까지 내리면 다음 쪽을 이어 붙이므로, 백엔드 GET /community/posts 를 그대로 중계한다(forward).
 * 게시판 키·쪽 번호는 여기서 한 번 걸러 백엔드에 잘못된 값이 가지 않게 한다.
 */
import { NextRequest, NextResponse } from "next/server";
import { isBoard } from "@/lib/community";
import { forward } from "@/lib/proxy";

/** 한 번에 받을 수 있는 최대 글 수 */
const MAX_PAGE_SIZE = 50;

/**
 * @param req 쿼리 board(필수: rating|free), page(1 이상), pageSize(1~50), q(선택 검색어)
 * @returns 백엔드 PostListResult({ items, notices, total, page, pageSize }) 또는 { message }
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const board = sp.get("board") ?? "";
  if (!isBoard(board)) {
    return NextResponse.json({ message: "없는 게시판입니다." }, { status: 400 });
  }
  const page = Math.max(1, Math.floor(Number(sp.get("page")) || 1));
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(sp.get("pageSize")) || 20)));
  const q = (sp.get("q") ?? "").trim();

  const p = new URLSearchParams({ board, page: String(page), pageSize: String(size) });
  if (q) p.set("q", q);
  return forward(`/community/posts?${p.toString()}`, "GET");
}
