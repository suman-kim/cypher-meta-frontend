/** 플레이 성향 태그 칩 */
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
        <span key={t} className="chip bg-primary/10 text-primary">
          {t}
        </span>
      ))}
    </div>
  );
}
