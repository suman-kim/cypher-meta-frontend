/**
 * Cyphers Meta 로고 — 브랜드 배지 마크(라운드 배지 + 티어 상승 바) + 워드마크.
 * 헤더/푸터 공용. size 로 크기 조절.
 */
export default function Logo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? 22 : 26;
  const text = size === "sm" ? "text-base" : "text-xl";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={dim} height={dim} viewBox="0 0 28 28" aria-hidden className="shrink-0">
        <rect x="1" y="1" width="26" height="26" rx="7.5" fill="#4f8ff0" />
        <rect x="6.4" y="15" width="3.3" height="6" rx="1.2" fill="#fff" />
        <rect x="12.35" y="11" width="3.3" height="10" rx="1.2" fill="#fff" />
        <rect x="18.3" y="7" width="3.3" height="14" rx="1.2" fill="#fff" />
      </svg>
      <span className={`${text} font-extrabold tracking-tight`}>
        <span className="text-primary">Cyphers</span>
        <span className="text-gray-100">&nbsp;Meta</span>
      </span>
    </span>
  );
}
