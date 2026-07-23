import Link from "next/link";

export default function NumberedPagination({
  page,
  pageSize,
  total,
  makeHref,
}: {
  page: number;
  pageSize: number;
  total: number;
  makeHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const windowSize = 5;
  let start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  const cell =
    "grid h-9 w-9 place-items-center rounded-md text-sm font-medium transition-colors";

  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} className={`${cell} btn-ghost`} aria-label="이전">
          ‹
        </Link>
      ) : (
        <span className={`${cell} btn-ghost cursor-not-allowed opacity-40`}>‹</span>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={makeHref(p)}
          className={
            p === page
              ? `${cell} bg-primary text-white`
              : `${cell} border border-line text-gray-400 hover:bg-surface-2 hover:text-gray-100`
          }
        >
          {p}
        </Link>
      ))}

      {page < totalPages ? (
        <Link href={makeHref(page + 1)} className={`${cell} btn-ghost`} aria-label="다음">
          ›
        </Link>
      ) : (
        <span className={`${cell} btn-ghost cursor-not-allowed opacity-40`}>›</span>
      )}
    </div>
  );
}
