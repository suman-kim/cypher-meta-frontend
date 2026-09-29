"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import type { RosterEntry, RoleCode } from "@/lib/votes";
import { UltimateBadge } from "@/components/characters/UltimateBadge";
import { OFFICIAL_ROLES, dualCharacterIds, groupUltimatesByRole, type CharacterUltimate } from "@/lib/official";

/** 선택 그리드 한 칸 — 기존 로스터와 공식 역할군 공용 */
interface PickerItem {
  characterId: string;
  characterName: string | null;
  /** 공식 역할군 체계에서 2차 보유 캐릭터면 1차/2차 배지 */
  ultimateType?: string;
}

const SECTIONS: { key: RoleCode | "etc"; label: string; color: string }[] = [
  { key: "tank", label: "탱커", color: "#5b8def" },
  { key: "melee", label: "근접딜러", color: "#e2506a" },
  { key: "ranged", label: "원거리딜러", color: "#4fbf6b" },
  { key: "support", label: "서포터", color: "#a15bf0" },
  { key: "etc", label: "미분류", color: "#9aa7b4" },
];

/**
 * 캐릭터 랭킹용 캐릭터 선택 — 포지션별 그룹 그리드.
 * @param characters — 기존 로스터(포지션 코드 포함)
 * @param rankingType — 랭킹 지표(링크 유지용)
 * @param selectedId — 현재 선택 캐릭터
 * @param officialUltimates — 공식 역할군 체계면 궁극기 정의 목록 → 공식 역할군 7종으로 묶는다(2차 캐릭터는 두 곳)
 */
export default function RankingCharacterPicker({
  characters,
  rankingType,
  selectedId,
  officialUltimates,
}: {
  characters: RosterEntry[];
  rankingType: string;
  selectedId?: string;
  officialUltimates?: CharacterUltimate[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const official = !!officialUltimates?.length;
  const sections: { key: string; label: string; color: string }[] = official
    ? OFFICIAL_ROLES.map((r) => ({ key: r.key, label: r.name, color: r.color }))
    : SECTIONS;
  const dual = useMemo(() => dualCharacterIds(officialUltimates ?? []), [officialUltimates]);

  const grouped = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const hit = (name: string | null) => !kw || (name ?? "").toLowerCase().includes(kw);
    if (official) {
      const g = groupUltimatesByRole((officialUltimates ?? []).filter((u) => hit(u.characterName)));
      return g as Record<string, PickerItem[]>;
    }
    const m: Record<string, PickerItem[]> = { tank: [], melee: [], ranged: [], support: [], etc: [] };
    for (const c of characters) {
      if (!hit(c.characterName)) continue;
      (m[c.role] ?? m.etc).push(c);
    }
    for (const k of Object.keys(m))
      m[k].sort((a, b) => (a.characterName ?? "").localeCompare(b.characterName ?? "", "ko"));
    return m;
  }, [characters, q, official, officialUltimates]);

  // 캐릭터 수(중복 제외) — 공식 역할군에서는 2차 캐릭터가 두 섹션에 나와도 1명
  const total = new Set(sections.flatMap((s) => (grouped[s.key] ?? []).map((c) => c.characterId))).size;

  function pick(id: string) {
    router.push(`/ranking/characters?characterId=${id}&rankingType=${rankingType}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2">
        <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="캐릭터 이름 검색"
          className="w-full bg-transparent text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
        />
        <span className="shrink-0 text-xs text-gray-500">{total}종</span>
      </div>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">검색 결과가 없습니다.</p>
      ) : (
        sections.map((s) => {
          const list = grouped[s.key] ?? [];
          if (list.length === 0) return null;
          return (
            <section key={s.key}>
              <div className="mb-2.5 flex items-center gap-2">
                <span className="h-4 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <h2 className="text-base font-bold text-gray-100">{s.label}</h2>
                <span className="chip bg-surface-2 text-gray-500">{list.length}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {list.map((c) => {
                  const active = c.characterId === selectedId;
                  return (
                    <button
                      key={c.ultimateType ? `${c.characterId}:${c.ultimateType}` : c.characterId}
                      type="button"
                      onClick={() => pick(c.characterId)}
                      className={`group flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-all hover:-translate-y-0.5 ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-line bg-surface hover:border-primary/60 hover:bg-surface-2"
                      }`}
                    >
                      <span className="relative">
                        <Avatar characterId={c.characterId} characterName={c.characterName ?? undefined} size={56} zoom={2} />
                        {c.ultimateType && dual.has(c.characterId) && (
                          <UltimateBadge ultimateType={c.ultimateType} className="absolute -right-1.5 -top-1.5" />
                        )}
                      </span>
                      <span
                        className={`w-full truncate text-center text-xs font-medium ${
                          active ? "text-primary" : "text-gray-300 group-hover:text-gray-100"
                        }`}
                      >
                        {c.characterName ?? c.characterId}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
