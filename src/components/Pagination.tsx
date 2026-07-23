import Link from "next/link";

interface Props {
  offset: number;
  limit: number;
  /** 이번 페이지에 실제로 받은 행 수 (limit 미만이면 마지막 페이지) */
  count: number;
  makeHref: (offset: number) => string;
  /** 페이지 번호 표시 개수 (기본 10) */
  window?: number;
}

export default function Pagination({ offset, limit, count, makeHref, window = 10 }: Props) {
  const page = Math.floor(offset / limit) + 1;
  const hasPrev = offset > 0;
  const hasNext = count >= limit;
  const isLast = count < limit;

  let start = Math.max(1, page - 4);
  let end = start + (window - 1);
  if (isLast) end = Math.min(end, page); // 마지막 페이지면 그 이상은 감춤
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  const numCls = (active: boolean) =>
    `grid h-9 min-w-9 place-items-center rounded-md px-2 text-sm font-semibold transition-colors ${
      active
        ? "bg-primary text-white"
        : "border border-line bg-surface-2 text-gray-300 hover:border-primary/50 hover:text-gray-100"
    }`;
  const navCls = (enabled: boolean) =>
    `grid h-9 place-items-center rounded-md px-2.5 text-sm font-medium ${
      enabled
        ? "border border-line bg-surface-2 text-gray-300 hover:border-primary/50 hover:text-gray-100"
        : "cursor-not-allowed border border-line text-gray-600 opacity-50"
    }`;

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5 py-5">
      {hasPrev ? (
        <Link href={makeHref(Math.max(0, offset - limit))} className={navCls(true)} aria-label="이전">
          ←
        </Link>
      ) : (
        <span className={navCls(false)}>←</span>
      )}

      {start > 1 && (
        <>
          <Link href={makeHref(0)} className={numCls(false)}>
            1
          </Link>
          {start > 2 && <span className="px-1 text-gray-500">…</span>}
        </>
      )}

      {pages.map((p) => {
        const active = p === page;
        return active ? (
          <span key={p} className={numCls(true)} aria-current="page">
            {p}
          </span>
        ) : (
          <Link key={p} href={makeHref((p - 1) * limit)} className={numCls(false)}>
            {p}
          </Link>
        );
      })}

      {hasNext ? (
        <Link href={makeHref(offset + limit)} className={navCls(true)} aria-label="다음">
          →
        </Link>
      ) : (
        <span className={navCls(false)}>→</span>
      )}
    </nav>
  );
}
