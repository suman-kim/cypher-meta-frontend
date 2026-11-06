/**
 * 앱 검색 탭 (시안 02) — 검색 입력 + (검색어 없으면) 최근 검색·즐겨찾기·도구 / (있으면) 검색 결과.
 * 결과가 정확히 1명이면 page.tsx 가 바로 플레이어 화면으로 보낸다.
 */
import Link from "next/link";
import type { PlayerSearchRow } from "@/lib/types";
import { AppTopBar } from "../../AppChrome";
import { Icon } from "../../icons";
import { AppPage, GhostLink, StateBox } from "../../ui";
import { AppSearchInput, SearchHomeLists } from "./SearchClient";

/** 검색 화면이 받는 값 */
export interface AppSearchProps {
  /** 검색어 (없으면 검색 첫 화면) */
  nickname: string;
  /** 검색 결과 (검색어가 있을 때) */
  rows: PlayerSearchRow[];
  /** 검색 실패 안내 (실패했을 때만) */
  error?: { title: string; description?: string } | null;
  /** 내 닉네임 연동 흐름인지 (결과·플레이어 주소에 link=1 유지) */
  link: boolean;
}

/** 멀티서치·플레이어 비교 바로가기 카드 */
function ToolCards() {
  const tools = [
    { href: "/players/multi", title: "멀티서치", desc: "내 팀 · 상대 팀 최근 전적을 한 화면에" },
    { href: "/players/compare", title: "플레이어 비교", desc: "두 플레이어의 함께한 경기 · 상대 전적" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {tools.map((t) => (
        <Link key={t.href} href={t.href} className="a-card a-press grid content-start gap-1 p-3.5">
          <span className="text-sm font-bold text-gray-100">{t.title}</span>
          <span className="text-[11px] leading-snug text-gray-500">{t.desc}</span>
        </Link>
      ))}
    </div>
  );
}

/**
 * @param props AppSearchProps
 */
export default function AppSearch({ nickname, rows, error, link }: AppSearchProps) {
  return (
    <>
      <AppTopBar variant={link ? "back" : "large"} title={link ? "내 닉네임 찾기" : "검색"} backHref="/account" />
      <AppPage>
        {link && (
          <p className="flex items-start gap-2 rounded-xl bg-surface-2 px-3.5 py-2.5 text-xs leading-relaxed text-gray-300">
            <span className="mt-px text-primary">
              <Icon name="info" size={15} />
            </span>
            닉네임을 검색한 뒤 내 플레이어 화면에서 [연동하기]를 누르세요.
          </p>
        )}
        <AppSearchInput key={nickname} defaultValue={nickname} link={link} autoFocus={!nickname && link} />

        {!nickname ? (
          <>
            <SearchHomeLists />
            <ToolCards />
          </>
        ) : error ? (
          <StateBox kind="error" title={error.title} desc={error.description} />
        ) : rows.length === 0 ? (
          <StateBox
            title={`"${nickname}" 플레이어를 찾지 못했어요`}
            desc="닉네임을 정확히 입력했는지 확인해 주세요. 띄어쓰기와 대소문자도 같아야 해요."
            action={<GhostLink href="/ranking">랭킹에서 찾아보기</GhostLink>}
          />
        ) : (
          <section className="grid gap-2">
            <p className="text-[13px] font-semibold text-gray-300">
              &ldquo;{nickname}&rdquo; 검색 결과 <span className="text-gray-500">{rows.length}</span>
            </p>
            <ul className="a-card grid divide-y divide-line overflow-hidden">
              {rows.map((p) => (
                <li key={p.playerId}>
                  <Link
                    href={`/players/${p.playerId}${link ? "?link=1" : ""}`}
                    className="flex items-center gap-3 px-4 py-3 active:bg-surface-2"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-extrabold text-gray-300">
                      {p.nickname.slice(0, 1)}
                    </span>
                    <span className="grid min-w-0 flex-1">
                      <span className="truncate text-sm font-bold text-gray-100">{p.nickname}</span>
                      <span className="truncate text-[11px] text-gray-500">
                        {p.clanName ? `클랜 ${p.clanName}` : "클랜 없음"}
                        {p.grade ? ` · 급수 ${p.grade}` : ""}
                      </span>
                    </span>
                    <span className="text-gray-500">
                      <Icon name="chevronRight" size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </AppPage>
    </>
  );
}
