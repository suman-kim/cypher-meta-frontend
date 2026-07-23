import { tagGroup, type TagGroup } from "@/lib/badges";

/**
 * 플레이 성향 태그 칩 — 5색 그룹(폼/픽/전투/특기-공격/특기-수비)별 배경색.
 * (색 클래스는 Tailwind 스캔 대상인 이 파일에 리터럴로 둔다)
 */
const GROUP_CLASS: Record<TagGroup, string> = {
  form: "bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-300",
  pick: "bg-violet-500/10 text-violet-600 ring-violet-500/25 dark:text-violet-300",
  combat: "bg-rose-500/10 text-rose-600 ring-rose-500/25 dark:text-rose-300",
  offense: "bg-sky-500/10 text-sky-600 ring-sky-500/25 dark:text-sky-300",
  utility: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300",
};

export default function TagChips({
  tags,
  className = "flex flex-wrap gap-1",
}: {
  tags: string[];
  className?: string;
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className={className}>
      {tags.map((t) => (
        <span
          key={t}
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${GROUP_CLASS[tagGroup(t)]}`}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
