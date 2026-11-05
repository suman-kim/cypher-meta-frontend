"use client";

/**
 * 앱 캐릭터 목록 (시안 17) — 이름 검색 + 역할군별 묶음 + 2차 각성 표시.
 * 공식 역할군 체계면 7종으로, 아니면 기존 포지션으로 묶은 값을 page.tsx 가 넘긴다.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { AppTopBar } from "../../AppChrome";
import { Icon } from "../../icons";
import { AppPage, CharImg, GhostLink, StateBox, UltBadge } from "../../ui";

/** 목록의 캐릭터 한 칸 */
export interface CharTile {
  /** 캐릭터 ID */
  characterId: string;
  /** 이름 */
  name: string;
  /** 상세 화면 주소 (궁극기 구분 포함) */
  href: string;
  /** "1차" | "2차" — 2차 각성 보유 캐릭터만 */
  ult?: string;
}

/** 역할군 묶음 */
export interface CharGroup {
  /** 역할군 키 */
  key: string;
  /** 역할군 이름 */
  label: string;
  /** 공식 역할군 아이콘을 쓸지 */
  official: boolean;
  /** 이 묶음의 캐릭터 */
  items: CharTile[];
}

/**
 * @param groups 역할군 묶음 목록 (비어 있으면 오류 상태)
 * @param official 공식 역할군 체계인지 (안내 문구용)
 */
export default function AppChars({ groups, official }: { groups: CharGroup[]; official: boolean }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((c) => c.name.toLowerCase().includes(kw)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, q]);
  const total = new Set(groups.flatMap((g) => g.items.map((c) => c.characterId))).size;

  return (
    <>
      <AppTopBar title="캐릭터" />
      <AppPage>
        <div className="grid gap-2">
          <label className="flex h-11 items-center gap-2.5 rounded-[22px] bg-surface-2 px-4">
            <span className="text-gray-500">
              <Icon name="search" size={17} />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="캐릭터 이름 검색"
              aria-label="캐릭터 이름 검색"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-100 outline-none"
            />
            {q ? (
              <button type="button" onClick={() => setQ("")} className="text-gray-500" aria-label="지우기">
                <Icon name="close" size={16} />
              </button>
            ) : (
              <span className="text-xs text-gray-500">{total}종</span>
            )}
          </label>
          <p className="text-xs text-gray-500">
            {official ? "공식 역할군 기준" : "포지션 기준"} · 캐릭터를 누르면 상세로 이동해요
          </p>
        </div>

        {groups.length === 0 ? (
          <StateBox
            kind="error"
            title="캐릭터 목록을 불러오지 못했어요"
            desc="잠시 뒤 다시 열어 주세요."
            action={<GhostLink href="/characters" icon="refresh">다시 불러오기</GhostLink>}
          />
        ) : filtered.length === 0 ? (
          <StateBox title="검색 결과가 없어요" desc={`"${q.trim()}" 이름의 캐릭터가 없어요.`} />
        ) : (
          filtered.map((g) => (
            <section key={g.key} className="grid gap-2.5">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-gray-100">
                {g.official && (
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2">
                    <OfficialRoleIcon role={g.key} size={18} />
                  </span>
                )}
                {g.label}
                <span className="text-[13px] font-semibold text-gray-500">{g.items.length}</span>
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {g.items.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="a-tile a-press grid justify-items-center gap-1 px-1 pb-2 pt-2.5"
                  >
                    <CharImg id={c.characterId} name={c.name} size={48} radius={12} />
                    <span className="w-full truncate text-center text-xs font-bold text-gray-100">{c.name}</span>
                    {c.ult ? <UltBadge label={c.ult} /> : <span className="h-[18px]" aria-hidden />}
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </AppPage>
    </>
  );
}
