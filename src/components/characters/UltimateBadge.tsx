/**
 * UltimateBadge — "1차" / "2차" 궁극기 배지. 아바타 모서리나 이름 옆에 붙인다.
 * 서버/클라이언트 컴포넌트 어디서든 쓸 수 있도록 훅을 쓰지 않는 순수 표시 컴포넌트다.
 */
import { ultimateLabel } from "@/lib/official";

/**
 * @param ultimateType — "1st" | "2nd"
 * @param className — 위치 지정 등 추가 클래스(예: "absolute -right-1 -top-1")
 */
export function UltimateBadge({ ultimateType, className = "" }: { ultimateType: string; className?: string }) {
  const second = ultimateType === "2nd";
  return (
    <span
      className={`inline-flex items-center rounded px-1 py-px text-[9px] font-black leading-none shadow-sm ${
        second ? "bg-[#8b5cf6] text-white" : "bg-surface-3 text-gray-300 ring-1 ring-line"
      } ${className}`}
      title={second ? "2차 궁극기" : "1차 궁극기"}
    >
      {ultimateLabel(ultimateType)}
    </span>
  );
}

/**
 * OfficialRoleChip — 공식 역할군 이름 칩(역할군 색 점 + 이름).
 * @param name — 공식 역할군 한글명
 * @param color — 역할군 색
 */
export function OfficialRoleChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="chip inline-flex items-center gap-1 bg-surface-3 text-gray-300">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}
