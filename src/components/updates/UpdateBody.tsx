/**
 * UpdateBody — 업데이트 본문 렌더러(고급 changelog 스타일).
 *  - "[신규] …", "[개선] …", "[수정] …" 등 대괄호 태그로 시작하는 줄 → 색상 태그 뱃지 + 텍스트
 *  - "- " / "• " / "* " 로 시작하는 줄 → 심플 불릿
 *  - 빈 줄 → 문단 구분, 그 외 → 문단 텍스트
 * 훅을 쓰지 않는 순수 렌더 컴포넌트라 서버/클라이언트 양쪽에서 사용 가능.
 */

/** 태그 별칭 → 표시 라벨 + 색상 클래스 */
const TAG_MAP: Record<string, { label: string; cls: string }> = {
  신규: { label: "신규", cls: "bg-emerald-500/12 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400" },
  추가: { label: "신규", cls: "bg-emerald-500/12 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400" },
  new: { label: "신규", cls: "bg-emerald-500/12 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400" },
  개선: { label: "개선", cls: "bg-primary/12 text-primary ring-primary/25" },
  변경: { label: "개선", cls: "bg-primary/12 text-primary ring-primary/25" },
  향상: { label: "개선", cls: "bg-primary/12 text-primary ring-primary/25" },
  수정: { label: "수정", cls: "bg-amber-500/12 text-amber-600 ring-amber-500/25 dark:text-amber-400" },
  버그: { label: "수정", cls: "bg-amber-500/12 text-amber-600 ring-amber-500/25 dark:text-amber-400" },
  fix: { label: "수정", cls: "bg-amber-500/12 text-amber-600 ring-amber-500/25 dark:text-amber-400" },
  긴급: { label: "긴급", cls: "bg-red-500/12 text-red-500 ring-red-500/25 dark:text-red-400" },
};

type Item = { tag: { label: string; cls: string } | null; text: string };

export default function UpdateBody({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let items: Item[] = [];
  let key = 0;

  const flush = () => {
    if (!items.length) return;
    const cur = items;
    items = [];
    blocks.push(
      <ul key={`l${key++}`} className="space-y-2">
        {cur.map((it, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-300">
            {it.tag ? (
              <span
                className={`mt-px inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${it.tag.cls}`}
              >
                {it.tag.label}
              </span>
            ) : (
              <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            )}
            <span className="min-w-0 flex-1 pt-0.5">{it.text}</span>
          </li>
        ))}
      </ul>,
    );
  };

  for (const raw of lines) {
    const t = raw.trim();
    const tagMatch = t.match(/^\[([^\]]{1,8})\]\s*(.*)$/);
    const tagKey = tagMatch ? tagMatch[1].trim() : "";
    const tag = tagMatch ? TAG_MAP[tagKey] ?? TAG_MAP[tagKey.toLowerCase()] : undefined;
    if (tag) {
      items.push({ tag, text: tagMatch![2] });
    } else if (/^[-•*]\s+/.test(t)) {
      items.push({ tag: null, text: t.replace(/^[-•*]\s+/, "") });
    } else if (t === "") {
      flush();
    } else {
      flush();
      blocks.push(
        <p key={`p${key++}`} className="text-sm leading-relaxed text-gray-300">
          {raw}
        </p>,
      );
    }
  }
  flush();

  return <div className={`space-y-2.5 ${className}`}>{blocks}</div>;
}
