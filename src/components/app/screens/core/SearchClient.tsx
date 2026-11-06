"use client";

/**
 * 앱 검색 탭의 상호작용 조각 — 검색 입력, 최근 검색·즐겨찾기 목록(기기 저장).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { addRecent, clearRecent, removeRecent, useFavs, useHydrated, useRecent } from "@/lib/app-storage";
import { Icon } from "../../icons";
import { CharImg, SectionHead, Skel } from "../../ui";

/**
 * 검색 입력줄. 제출하면 최근 검색에 넣고 결과 화면으로 간다.
 * @param defaultValue 처음 채워 둘 검색어
 * @param link true 면 내 닉네임 연동 흐름 — 결과·플레이어 화면 주소에 link=1 을 붙인다
 * @param autoFocus 화면이 열리면 바로 입력할 수 있게 할지
 * @param placeholder 빈 칸 안내 글
 */
export function AppSearchInput({
  defaultValue = "",
  link = false,
  autoFocus = false,
  placeholder = "닉네임으로 전적 검색",
}: {
  defaultValue?: string;
  link?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    addRecent(t);
    router.push(`/search?nickname=${encodeURIComponent(t)}${link ? "&link=1" : ""}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="flex h-12 items-center gap-2.5 rounded-3xl bg-surface-2 pl-[18px] pr-2">
      <span className="text-gray-500">
        <Icon name="search" size={18} />
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        enterKeyHint="search"
        maxLength={20}
        placeholder={placeholder}
        aria-label="닉네임"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-100 outline-none"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ("")}
          className="grid h-8 w-8 place-items-center rounded-full text-gray-500 active:bg-surface-3"
          aria-label="지우기"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </form>
  );
}

/** 검색 탭 첫 화면 — 최근 검색 / 즐겨찾기 (기기 저장) */
export function SearchHomeLists() {
  const hydrated = useHydrated();
  const recent = useRecent();
  const favs = useFavs();

  if (!hydrated) {
    return (
      <div className="grid gap-3">
        <Skel className="h-5 w-24 rounded" />
        {[0, 1, 2].map((i) => (
          <Skel key={i} className="h-11 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <section className="grid grid-cols-1 gap-1">
        <SectionHead
          title="최근 검색"
          right={
            recent.length > 0 ? (
              <button type="button" onClick={clearRecent} className="text-xs text-gray-500">
                전체 삭제
              </button>
            ) : undefined
          }
        />
        {recent.length === 0 ? (
          <p className="py-3 text-[13px] text-gray-500">최근에 검색한 닉네임이 여기에 남아요.</p>
        ) : (
          <ul className="grid">
            {recent.map((r) => (
              <li key={r} className="flex h-12 items-center gap-3">
                <span className="text-gray-500">
                  <Icon name="clock" size={18} />
                </span>
                <Link href={`/search?nickname=${encodeURIComponent(r)}`} className="min-w-0 flex-1 truncate text-sm text-gray-100">
                  {r}
                </Link>
                <button
                  type="button"
                  onClick={() => removeRecent(r)}
                  className="grid h-9 w-9 place-items-center rounded-full text-gray-500 active:bg-surface-2"
                  aria-label={`${r} 지우기`}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 gap-1">
        <SectionHead title="즐겨찾기" href={favs.length > 0 ? "/account" : undefined} cta="편집" />
        {favs.length === 0 ? (
          <p className="py-3 text-[13px] text-gray-500">플레이어 화면 위쪽의 별을 누르면 여기에 모여요.</p>
        ) : (
          <ul className="grid">
            {favs.map((f) => (
              <li key={f.playerId}>
                <Link href={`/players/${f.playerId}`} className="flex items-center gap-3 py-2">
                  <CharImg id={f.characterId} name={f.nickname} size={38} radius={19} />
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-sm font-bold text-gray-100">{f.nickname}</span>
                    <span className="text-[11px] text-gray-500">
                      {f.rank ? `공식전 ${f.rank.toLocaleString()}위` : f.tierName ?? "순위 정보 없음"}
                    </span>
                  </span>
                  <span className="text-sm font-extrabold tabular-nums text-primary">{f.rp ? f.rp.toLocaleString() : "-"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
