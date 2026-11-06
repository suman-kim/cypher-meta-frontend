"use client";

/**
 * 앱 캐릭터 상세의 상호작용 조각 — 정보·빌드·랭커 세그먼트 전환, 1차/2차 궁극기 전환.
 *
 * - 세그먼트는 화면 안에서 바로 바뀌고(서버 재요청 없음), 주소의 ?tab= 도 함께 바꿔 둔다
 *   (새로 고침·뒤로 가기·궁극기 전환 뒤에도 보던 칸이 유지되게).
 * - 궁극기 전환은 지표·빌드가 바뀌어야 하므로 ?ult= 주소로 이동한다(지금 칸·랭커 지표는 유지).
 */
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Segmented } from "../../ui";

/** 상세 세그먼트 키 */
export type CharTabKey = "info" | "build" | "rank";

/** 세그먼트 정의 */
const TABS: { key: CharTabKey; label: string }[] = [
  { key: "info", label: "정보" },
  { key: "build", label: "빌드" },
  { key: "rank", label: "랭커" },
];

/**
 * 주소 쿼리 값이 세그먼트 키인지 확인한다.
 * @param v 쿼리 값
 */
function isTab(v: string | null): v is CharTabKey {
  return v === "info" || v === "build" || v === "rank";
}

/**
 * 정보·빌드·랭커 세그먼트 + 지금 칸 내용.
 * @param info 정보 칸 내용(서버에서 그린 것)
 * @param build 빌드 칸 내용
 * @param rank 랭커 칸 내용
 */
export function CharTabs({ info, build, rank }: { info: ReactNode; build: ReactNode; rank: ReactNode }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const q = sp.get("tab");
  const [tab, setTab] = useState<CharTabKey>(isTab(q) ? q : "info");

  /** 칸 전환 — 주소의 tab 도 바꿔 둔다(기록은 쌓지 않음). */
  function change(k: string) {
    if (!isTab(k)) return;
    setTab(k);
    const p = new URLSearchParams(sp.toString());
    if (k === "info") p.delete("tab");
    else p.set("tab", k);
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <Segmented items={TABS} value={tab} onChange={change} />
      <div key={tab} className="a-fade grid grid-cols-1 gap-3">
        {tab === "info" ? info : tab === "build" ? build : rank}
      </div>
    </div>
  );
}

/**
 * 1차/2차 궁극기 전환 세그먼트 (2차 궁극기 보유 캐릭터만).
 * @param items 궁극기 칸 (key: "1st"|"2nd", label: 표시 글자)
 * @param value 지금 궁극기
 */
export function UltSwitch({ items, value }: { items: { key: string; label: string }[]; value: string }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  return (
    <Segmented
      size="sm"
      value={value}
      items={items.map((it) => {
        const p = new URLSearchParams(sp.toString());
        p.set("ult", it.key);
        return { key: it.key, label: it.label, href: `${pathname}?${p.toString()}` };
      })}
    />
  );
}
