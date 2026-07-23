/**
 * 순위 변동 표시 — 이전 순위(beforeRank)와 현재 순위(rank)를 비교.
 *   상승: ▲(녹색) / 하락: ▼(빨강) / 변동 없음: – / 신규 진입: NEW
 * delta = beforeRank - rank  (양수면 순위가 올라감)
 */
export default function RankChange({
  rank,
  beforeRank,
  size = "sm",
}: {
  rank: number;
  beforeRank?: number;
  size?: "sm" | "md";
}) {
  const text = size === "md" ? "text-xs" : "text-[10px]";

  // 이전 순위가 없거나 0 → 신규 진입
  if (beforeRank === undefined || beforeRank === null || beforeRank <= 0) {
    return (
      <span
        className={`inline-flex items-center rounded-sm bg-primary/15 px-1 font-bold text-primary ${text}`}
        title="신규 진입"
      >
        NEW
      </span>
    );
  }

  const delta = beforeRank - rank;

  if (delta === 0) {
    return (
      <span className={`inline-flex items-center text-gray-500 ${text}`} title="변동 없음">
        –
      </span>
    );
  }

  const up = delta > 0;
  const amount = Math.abs(delta);
  // 한국식 표기: 순위 상승 = 빨강(--lose), 순위 하락 = 파랑(--primary)
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-bold tabular-nums ${text}`}
      style={{ color: up ? "rgb(var(--lose))" : "rgb(var(--primary))" }}
      title={up ? `${amount}계단 상승` : `${amount}계단 하락`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {amount}
    </span>
  );
}
