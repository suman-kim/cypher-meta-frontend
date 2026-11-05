"use client";

/**
 * 앱 커뮤니티 목록 화면 (시안 12).
 *
 * 구성: 상단바(뒤로 + "커뮤니티" + 검색) → 게시판 세그먼트(공식전/일반전, 상단바에 붙음)
 *       → 분류 칩(전체·자유·질문·정보·토론) → 공지 줄 → 인기글 카드 → 글 목록(끝까지 내리면 이어 불러오기)
 *       → 오른쪽 아래 떠 있는 [글쓰기] 버튼.
 * - 검색은 웹과 같은 ?q= 주소를 쓴다(서버가 첫 쪽을 다시 그린다). 게시판 전환도 주소(/community/<board>)로.
 * - 백엔드 목록 API 에 분류 필터가 없어, 분류 칩은 불러온 글 안에서 고른다. 고른 분류 글이 적으면
 *   화면 끝 감지가 계속 다음 쪽을 불러와 채운다.
 * - 다음 쪽은 /api/app/community-posts (백엔드 목록 중계)로 받는다.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  BOARDS,
  CATEGORIES,
  categoryLabel,
  isBoard,
  type BoardKey,
  type CategoryKey,
  type CommunityPost,
  type PostListResult,
} from "@/lib/community";
import { formatMatchListDate } from "@/lib/format";
import { AppTopBar, TABBAR_H, TopIconButton } from "../../AppChrome";
import { Icon } from "../../icons";
import { AppPage, Badge, Chip, ChipRow, GhostLink, Segmented, Skel, StateBox } from "../../ui";
import { compactNum, inputCls, Spinner } from "./social-ui";

/** 앱 커뮤니티 목록이 받는 데이터 */
export interface AppCommunityProps {
  /** 지금 게시판 키 (rating 공식전 / free 일반전) */
  board: BoardKey;
  /** 검색어 (없으면 빈 문자열) */
  q: string;
  /** 첫 쪽 목록 — 불러오기에 실패하면 null */
  initial: PostListResult | null;
  /** 인기글 (최대 3) */
  trending: CommunityPost[];
  /** 위에 고정할 공지 (이 게시판 공지 + 전체 공지, 중복 제거) */
  notices: CommunityPost[];
  /** 한 쪽에 받는 글 수 */
  pageSize: number;
}

/** 분류 칩 값 — all 이면 전체 */
type CatFilter = "all" | CategoryKey;

/**
 * 글이 속한 게시판 주소 조각 (공지가 다른 게시판 글일 수 있다).
 * @param p 글
 * @param fallback 운영 게시판이 아니면 쓸 게시판
 */
function boardOf(p: CommunityPost, fallback: BoardKey): BoardKey {
  return isBoard(p.boardType) ? p.boardType : fallback;
}

/**
 * @param props AppCommunityProps
 */
export default function AppCommunity({ board, q, initial, trending, notices, pageSize }: AppCommunityProps) {
  const router = useRouter();
  const [items, setItems] = useState<CommunityPost[]>(initial?.items ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState(false);
  // 받은 쪽이 비었거나 덜 찼으면 끝으로 본다 — 새 글이 생겨 쪽이 밀려도 빈 쪽을 끝없이 부르지 않게
  const [ended, setEnded] = useState((initial?.items.length ?? 0) < pageSize);
  const [cat, setCat] = useState<CatFilter>("all");
  const [searchOpen, setSearchOpen] = useState(!!q);
  const [text, setText] = useState(q);
  const busyRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const hasMore = !ended && items.length < total;
  const visible = cat === "all" ? items : items.filter((p) => p.category === cat);

  /** 다음 쪽을 받아 이어 붙인다 (이미 받는 중이면 건너뜀) */
  const loadMore = useCallback(async () => {
    if (busyRef.current || !hasMore) return;
    busyRef.current = true;
    setLoading(true);
    setLoadErr(false);
    try {
      const p = new URLSearchParams({ board, page: String(page + 1), pageSize: String(pageSize) });
      if (q) p.set("q", q);
      const res = await fetch(`/api/app/community-posts?${p.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const d = (await res.json()) as PostListResult;
      if ((d.items?.length ?? 0) < pageSize) setEnded(true);
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...(d.items ?? []).filter((x) => !seen.has(x.id))];
      });
      setTotal(d.total ?? 0);
      setPage((n) => n + 1);
    } catch {
      setLoadErr(true);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [board, hasMore, page, pageSize, q]);

  // 목록 끝 감지 → 다음 쪽. 글 수·분류가 바뀔 때마다 다시 관찰해서,
  // 끝이 계속 보이면(분류로 걸러 글이 적을 때) 이어서 더 불러온다.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadErr) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore, loadErr, items.length, cat]);

  /** 검색 제출 — 웹과 같은 ?q= 주소로 바꿔 서버가 첫 쪽을 다시 그리게 한다 */
  function onSearch(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    router.replace(t ? `/community/${board}?q=${encodeURIComponent(t)}` : `/community/${board}`, { scroll: false });
  }

  /** 검색창 열기/닫기 — 닫으면 검색도 푼다 */
  function toggleSearch() {
    if (searchOpen) {
      setSearchOpen(false);
      setText("");
      if (q) router.replace(`/community/${board}`, { scroll: false });
    } else {
      setSearchOpen(true);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }

  const showTop = !q && cat === "all";
  const writeHref = `/community/${board}/write`;

  return (
    <>
      <AppTopBar
        title="커뮤니티"
        backHref="/more"
        right={
          <TopIconButton
            icon={searchOpen ? "close" : "search"}
            label={searchOpen ? "검색 닫기" : "글 검색"}
            onClick={toggleSearch}
          />
        }
      >
        <div className="grid gap-2">
          {searchOpen && (
            <form onSubmit={onSearch} className="flex gap-2" role="search">
              <span className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
                  <Icon name="search" size={17} />
                </span>
                <input
                  ref={searchRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  enterKeyHint="search"
                  placeholder="제목·내용으로 검색"
                  aria-label="글 검색어"
                  maxLength={50}
                  className={`${inputCls()} h-10 pl-10`}
                />
              </span>
              <button type="submit" className="a-grad h-10 shrink-0 rounded-[14px] px-4 text-sm font-bold">
                검색
              </button>
            </form>
          )}
          <Segmented
            items={BOARDS.map((b) => ({ key: b.key, label: b.label, href: `/community/${b.key}` }))}
            value={board}
          />
        </div>
      </AppTopBar>

      <AppPage className="!gap-4 pb-28">
        {/* 분류 칩 */}
        <ChipRow>
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            전체
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)}>
              {c.label}
            </Chip>
          ))}
        </ChipRow>

        {/* 검색 중이면 결과 수와 지우기 */}
        {q && initial && (
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <p className="min-w-0 truncate text-gray-300">
              <span className="font-bold text-gray-100">&lsquo;{q}&rsquo;</span> 검색 결과{" "}
              <span className="font-bold text-primary">{total.toLocaleString()}</span>건
            </p>
            <Link href={`/community/${board}`} replace className="shrink-0 text-xs font-semibold text-gray-500">
              검색어 지우기
            </Link>
          </div>
        )}

        {!initial ? (
          <StateBox
            kind="error"
            title="글 목록을 불러오지 못했어요"
            desc="잠시 뒤 다시 시도해 주세요."
            action={
              <button
                type="button"
                onClick={() => router.refresh()}
                className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
              >
                <Icon name="refresh" size={15} />
                다시 시도
              </button>
            }
          />
        ) : (
          <>
            {/* 공지 */}
            {showTop && notices.length > 0 && (
              <div className="grid gap-2">
                {notices.map((n) => (
                  <Link
                    key={n.id}
                    href={`/community/${boardOf(n, board)}/${n.id}`}
                    className="a-tile a-press flex items-center gap-2.5 px-3.5 py-3"
                  >
                    <Badge tone="grad">공지</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-100">{n.title}</span>
                    <span className="text-gray-500">
                      <Icon name="chevronRight" size={15} />
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* 인기글 */}
            {showTop && trending.length > 0 && (
              <section className="a-card grid gap-1 px-4 pb-2 pt-3.5" aria-label="인기글">
                <h2 className="flex items-center gap-1.5 pb-1 text-[15px] font-extrabold text-gray-100">
                  <span className="text-app-loss-tx">
                    <Icon name="flame" size={16} />
                  </span>
                  인기글
                </h2>
                {trending.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/community/${boardOf(p, board)}/${p.id}`}
                    className="flex items-center gap-3 py-1.5 active:opacity-70"
                  >
                    <span className="w-4 shrink-0 text-center text-sm font-extrabold text-primary tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-gray-200">{p.title}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-gray-500 tabular-nums">
                      <Icon name="thumb" size={13} />
                      {compactNum(p.likes)}
                    </span>
                  </Link>
                ))}
              </section>
            )}

            {/* 글 목록 */}
            {items.length === 0 ? (
              q ? (
                <StateBox
                  title="검색 결과가 없어요"
                  desc="다른 단어로 검색하거나 게시판을 바꿔 보세요."
                  action={<GhostLink href={`/community/${board}`}>검색어 지우기</GhostLink>}
                />
              ) : (
                <StateBox
                  icon="pen"
                  title="게시글이 없어요"
                  desc="첫 글을 작성해 보세요."
                  action={
                    <GhostLink href={writeHref} icon="pen">
                      첫 글 작성하기
                    </GhostLink>
                  }
                />
              )
            ) : (
              <>
                {visible.length > 0 ? (
                  <ul className="-mx-4 divide-y divide-line border-y border-line">
                    {visible.map((p) => (
                      <PostRow key={p.id} post={p} board={board} />
                    ))}
                  </ul>
                ) : (
                  !hasMore && (
                    <StateBox
                      title={`${categoryLabel(cat)} 분류 글이 아직 없어요`}
                      desc="다른 분류를 골라 보거나 첫 글을 남겨 보세요."
                      action={
                        <button
                          type="button"
                          onClick={() => setCat("all")}
                          className="a-press inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
                        >
                          전체 글 보기
                        </button>
                      }
                    />
                  )
                )}

                {/* 이어 불러오기 */}
                <div ref={sentinelRef} aria-hidden="true" />
                {loading && (
                  <>
                    {visible.length === 0 && <Skel className="h-16 rounded-[14px]" />}
                    <p className="flex items-center justify-center gap-2 py-2 text-xs text-gray-500">
                      <Spinner size={14} />
                      이전 글을 불러오는 중
                    </p>
                  </>
                )}
                {loadErr && (
                  <div className="flex flex-col items-center gap-2 py-2 text-xs text-gray-500">
                    <span>글을 더 불러오지 못했어요.</span>
                    <button
                      type="button"
                      onClick={() => loadMore()}
                      className="a-press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
                    >
                      <Icon name="refresh" size={15} />
                      다시 시도
                    </button>
                  </div>
                )}
                {!hasMore && visible.length > 0 && (
                  <p className="py-2 text-center text-xs text-gray-500">마지막 글까지 모두 봤어요.</p>
                )}
              </>
            )}
          </>
        )}
      </AppPage>

      {/* 글쓰기 — 하단 탭바 위에 떠 있는 버튼 */}
      <Link
        href={writeHref}
        className="a-grad a-glow a-press fixed z-30 flex h-12 items-center gap-1.5 rounded-full pl-4 pr-5 text-[15px] font-bold"
        style={{
          bottom: `calc(${TABBAR_H + 14}px + env(safe-area-inset-bottom))`,
          right: "max(16px, calc((100vw - 36rem) / 2 + 16px))",
        }}
      >
        <Icon name="plus" size={19} stroke={2.4} />
        글쓰기
      </Link>
    </>
  );
}

/**
 * 글 목록 한 줄 — 분류 배지·제목(두 줄까지) / 작성자·시간 · 조회·추천·댓글 수.
 * @param post 글
 * @param board 지금 게시판 (글 주소에 쓴다)
 */
function PostRow({ post, board }: { post: CommunityPost; board: BoardKey }) {
  return (
    <li>
      <Link href={`/community/${board}/${post.id}`} className="grid gap-1.5 px-4 py-3 transition-colors active:bg-surface-2">
        <span className="flex items-start gap-2">
          <Badge tone="mute" className="mt-[3px]">
            {categoryLabel(post.category)}
          </Badge>
          <span className="line-clamp-2 min-w-0 flex-1 text-[15px] font-semibold leading-snug text-gray-100">{post.title}</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="max-w-[40%] truncate font-medium text-gray-300">{post.authorName ?? "익명"}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0" suppressHydrationWarning>
            {formatMatchListDate(post.createdAt)}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2.5 tabular-nums">
            <span className="flex items-center gap-1" aria-label={`조회 ${post.views}`}>
              <Icon name="eye" size={13} />
              {compactNum(post.views)}
            </span>
            <span className={`flex items-center gap-1 ${post.likes > 0 ? "font-semibold text-primary" : ""}`} aria-label={`추천 ${post.likes}`}>
              <Icon name="thumb" size={13} />
              {compactNum(post.likes)}
            </span>
            <span className="flex items-center gap-1" aria-label={`댓글 ${post.commentCount}`}>
              <Icon name="comment" size={13} />
              {post.commentCount}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
