import Link from "next/link";

interface Props {
  /** 현재 offset */
  offset: number;
  limit: number;
  /** 이번 페이지에 실제로 받은 행 수 (limit 미만이면 마지막 페이지로 간주) */
  count: number;
  /** offset 값을 넣어 URL 을 만드는 함수 */
  makeHref: (offset: number) => string;
}

export default function Pagination({ offset, limit, count, makeHref }: Props) {
  const page = Math.floor(offset / limit) + 1;
  const hasPrev = offset > 0;
  const hasNext = count >= limit;

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {hasPrev ? (
        <Link href={makeHref(Math.max(0, offset - limit))} className="btn-ghost">
          ← 이전
        </Link>
      ) : (
        <span className="btn-ghost cursor-not-allowed opacity-40">← 이전</span>
      )}
      <span className="text-sm font-medium text-gray-400">{page} 페이지</span>
      {hasNext ? (
        <Link href={makeHref(offset + limit)} className="btn-ghost">
          다음 →
        </Link>
      ) : (
        <span className="btn-ghost cursor-not-allowed opacity-40">다음 →</span>
      )}
    </div>
  );
}
