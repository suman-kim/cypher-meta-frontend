"use client";

/**
 * OfficialCharacterRoster — 공식 역할군 7종으로 묶은 캐릭터 목록(포지션 체계 official 전용).
 * 2차 궁극기가 있는 캐릭터는 1차·2차 역할군 섹션에 각각 나오며, 아바타 모서리에 "1차/2차" 배지를 붙인다.
 * (legacy 체계에서는 기존 CharacterRoster 를 그대로 쓴다)
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/CharacterAvatar";
import { UltimateBadge } from "@/components/characters/UltimateBadge";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { characterHref, OFFICIAL_ROLES,
  dualCharacterIds,
  groupUltimatesByRole,
  unitKey,
  type CharacterUltimate, } from "@/lib/official";

/**
 * @param ultimates — 캐릭터별 1차/2차 궁극기 정의 목록(GET /meta/ultimates)
 */
export default function OfficialCharacterRoster({ ultimates }: { ultimates: CharacterUltimate[] }) {
  const [q, setQ] = useState("");

  // 검색어로 거른 뒤 역할군별로 묶는다
  const grouped = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const filtered = kw ? ultimates.filter((u) => u.characterName.toLowerCase().includes(kw)) : ultimates;
    return groupUltimatesByRole(filtered);
  }, [ultimates, q]);
  const dual = useMemo(() => dualCharacterIds(ultimates), [ultimates]);
  // 캐릭터 수(중복 제외) — 2차 보유 캐릭터가 두 섹션에 나와도 1명으로 센다
  const total = useMemo(
    () => new Set(Object.values(grouped).flat().map((u) => u.characterId)).size,
    [grouped],
  );

  return (
    <div className="space-y-6">
      {/* 검색 */}
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
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

      <p className="text-xs text-gray-500">
        공식 역할군 기준입니다. 2차 궁극기가 있는 캐릭터는 궁극기에 따라 역할군이 달라 두 곳에 나올 수 있어요.
      </p>

      {total === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">검색 결과가 없습니다.</p>
      ) : (
        OFFICIAL_ROLES.map((role) => {
          const list = grouped[role.key];
          if (list.length === 0) return null;
          return (
            <section key={role.key}>
              <div className="mb-2.5 flex items-center gap-2">
                <OfficialRoleIcon role={role.key} size={22} />
                <h2 className="text-base font-bold text-gray-100" title={role.desc}>
                  {role.name}
                </h2>
                <span className="chip bg-surface-2 text-gray-500">{list.length}</span>
                <span className="hidden text-xs text-gray-500 sm:inline">{role.desc}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {list.map((u) => (
                  <Link
                    key={unitKey(u.characterId, u.ultimateType)}
                    href={characterHref(u.characterId, u.ultimateType)}
                    title={`${u.characterName} · ${u.skillName}`}
                    className="group flex flex-col items-center gap-1.5 rounded-lg border border-line bg-surface p-2 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-surface-2"
                  >
                    <div className="relative">
                      <Avatar characterId={u.characterId} characterName={u.characterName} size={56} zoom={2} />
                      {dual.has(u.characterId) && (
                        <UltimateBadge ultimateType={u.ultimateType} className="absolute -right-1.5 -top-1.5" />
                      )}
                    </div>
                    <span className="w-full truncate text-center text-xs font-medium text-gray-300 group-hover:text-gray-100">
                      {u.characterName}
                    </span>
                    <span className="w-full truncate text-center text-[10px] text-gray-500">{u.skillName}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
