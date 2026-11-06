"use client";

/**
 * 캐릭터별 랭킹의 캐릭터 고르기 — 이름 검색 + 역할군 묶음 그리드.
 * 고르면 /ranking/characters?characterId=…&rankingType=… 로 이동한다(지표 유지).
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { Icon } from "../../icons";
import { CharImg, UltBadge } from "../../ui";

/** 고르기 묶음 한 칸 */
export interface PickerItem {
  /** 캐릭터 ID */
  characterId: string;
  /** 캐릭터 이름 */
  name: string;
  /** 2차 보유 캐릭터의 궁극기 표시("1차"/"2차") — 없으면 null */
  ultLabel: string | null;
}

/** 역할군 묶음 */
export interface PickerGroup {
  /** 묶음 키 */
  key: string;
  /** 묶음 이름 (역할군) */
  label: string;
  /** 공식 역할군이면 아이콘을 그릴 역할군 키 (예전 체계면 null) */
  roleIcon: string | null;
  /** 묶음 안 캐릭터 */
  items: PickerItem[];
}

/**
 * @param groups 역할군 묶음 목록
 * @param rankingType 지금 랭킹 지표 (링크에 유지)
 */
export default function CharPicker({ groups, rankingType }: { groups: PickerGroup[]; rankingType: string }) {
  const [q, setQ] = useState("");
  const kw = q.trim().toLowerCase();
  const shown = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, items: kw ? g.items.filter((c) => c.name.toLowerCase().includes(kw)) : g.items }))
        .filter((g) => g.items.length > 0),
    [groups, kw],
  );
  const total = new Set(shown.flatMap((g) => g.items.map((c) => c.characterId))).size;

  return (
    <div className="grid grid-cols-1 gap-4">
      <label className="flex h-12 items-center gap-2.5 rounded-3xl bg-surface-2 px-[18px] text-gray-500">
        <Icon name="search" size={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="캐릭터 이름 검색"
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-100 focus:outline-none"
          enterKeyHint="search"
        />
        {q ? (
          <button type="button" onClick={() => setQ("")} aria-label="검색어 지우기" className="grid h-7 w-7 place-items-center rounded-full">
            <Icon name="close" size={16} />
          </button>
        ) : (
          <span className="shrink-0 text-xs">{total}종</span>
        )}
      </label>

      {shown.length === 0 ? (
        <div className="a-card grid justify-items-center gap-2.5 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-gray-200">검색 결과가 없어요</p>
          <p className="text-xs text-gray-500">캐릭터 이름을 다시 확인해 주세요.</p>
          <button
            type="button"
            onClick={() => setQ("")}
            className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] font-semibold text-gray-200"
          >
            검색어 지우기
          </button>
        </div>
      ) : (
        shown.map((g) => (
          <section key={g.key} className="grid grid-cols-1 gap-2.5">
            <h2 className="flex items-center gap-1.5 text-[15px] font-extrabold text-gray-100">
              {g.roleIcon && <OfficialRoleIcon role={g.roleIcon} size={20} />}
              {g.label}
              <span className="text-xs font-semibold text-gray-500">{g.items.length}</span>
            </h2>
            <div className="grid grid-cols-4 gap-2 min-[400px]:grid-cols-5">
              {g.items.map((c) => (
                <Link
                  key={`${c.characterId}-${c.ultLabel ?? ""}`}
                  href={`/ranking/characters?characterId=${c.characterId}&rankingType=${rankingType}`}
                  className="a-tile a-press grid min-w-0 justify-items-center gap-1 px-1 py-2"
                >
                  <span className="relative">
                    <CharImg id={c.characterId} name={c.name} size={52} radius={14} />
                    {c.ultLabel && (
                      <span className="absolute -right-1.5 -top-1.5">
                        <UltBadge label={c.ultLabel} />
                      </span>
                    )}
                  </span>
                  <span className="w-full truncate text-center text-[11px] font-semibold text-gray-300">{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
