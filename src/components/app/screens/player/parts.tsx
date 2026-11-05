/**
 * 앱 플레이어·매치 화면에서 함께 쓰는 작은 표시 부품 (훅 없음 → 서버·클라이언트 어디서나).
 *
 * - AppItemIcon: 실제 아이템 그림 + 희귀도 테두리 (웹 ItemIcon 과 달리 웹 아이템 화면으로 가는 링크가 없다)
 * - SubLabel: 카드 안 작은 소제목
 * - MiniStat: 숫자 타일(라벨 + 값)
 * - shortSlot / shortDate: 부위·날짜 짧은 표기
 * 공용으로 올릴 후보: AppItemIcon, MiniStat (다른 화면에서도 아이템·숫자 타일이 필요하면).
 */
import type { ReactNode } from "react";
import SafeImage from "@/components/SafeImage";
import { itemImage } from "@/lib/images";
import { rarityMeta } from "@/lib/constants";
import { parseKstParts } from "@/lib/format";

/**
 * 아이템 그림 (희귀도 색 테두리, 둥근 모서리).
 * @param itemId 아이템 ID (없으면 이름 첫 글자로 대체)
 * @param itemName 아이템 이름 (대체 글자·alt)
 * @param rarityCode 희귀도 코드 101~104 (테두리 색)
 * @param size 한 변 크기(px)
 */
export function AppItemIcon({
  itemId,
  itemName,
  rarityCode,
  size = 28,
}: {
  itemId?: string | null;
  itemName?: string | null;
  rarityCode?: string | null;
  size?: number;
}) {
  const rarity = rarityMeta(rarityCode ?? undefined);
  return (
    <span
      className="inline-block shrink-0 overflow-hidden rounded-[7px] border-[1.5px] bg-app-ph"
      style={{ width: size, height: size, borderColor: rarity?.color ?? "var(--a-hair)" }}
    >
      <SafeImage
        src={itemImage(itemId ?? undefined)}
        alt={itemName ?? "아이템"}
        fallbackText={itemName?.slice(0, 1)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

/**
 * 카드 안 작은 소제목 (12px 굵은 회색).
 * @param children 제목 글자
 * @param right 오른쪽 보조 요소 (선택)
 */
export function SubLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-bold text-gray-300">{children}</span>
      {right && <span className="text-[11px] text-gray-500">{right}</span>}
    </div>
  );
}

/**
 * 숫자 타일 — 라벨 위, 값 아래.
 * @param label 지표 이름
 * @param value 표시 값
 * @param tone 값 색 (default | win | loss | ac)
 */
export function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: "default" | "win" | "loss" | "ac";
}) {
  const c = { default: "text-gray-100", win: "text-app-win-tx", loss: "text-app-loss-tx", ac: "text-primary" }[tone];
  return (
    <div className="grid min-w-0 gap-0.5 rounded-xl bg-bg px-2.5 py-2">
      <span className="truncate text-[10.5px] text-gray-500">{label}</span>
      <span className={`truncate text-[14px] font-extrabold tabular-nums ${c}`}>{value}</span>
    </div>
  );
}

/**
 * 부위 이름을 짧게. ("손(공격)" → "손", "회복킷" → "회복")
 * @param s 부위 이름
 */
export function shortSlot(s?: string | null): string {
  if (!s) return "";
  return s.replace(/\(.*?\)/g, "").replace(/킷$/, "").trim();
}

/**
 * 매치 시각을 "2026.11.05 21:14" 로 적는다. (KST 벽시계 기준, 서버 타임존 무관)
 * @param dateStr Neople 날짜 문자열
 */
export function shortDate(dateStr?: string): string {
  const p = parseKstParts(dateStr);
  if (!p) return dateStr ?? "-";
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.year}.${z(p.month)}.${z(p.day)} ${z(p.hour)}:${z(p.minute)}`;
}

/**
 * 초를 "12:34" 로 적는다.
 * @param sec 경기 시간(초)
 */
export function clockTime(sec?: number): string {
  if (!sec || sec <= 0) return "-";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
