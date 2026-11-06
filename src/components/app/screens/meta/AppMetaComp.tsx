/**
 * 앱 메타 · 조합 티어 화면 (시안 06).
 *
 * 구성: 메타 상단바(조합 티어 선택) → 편성 칩(5인 풀팀 · 듀오 · 트리오 / 예전 체계는 딜러 듀오 등)
 *       → 기준(빈도·승률) → [듀오·트리오] 역할군 칩 → 조합 카드(#순위, 승률·판수, 캐릭터 얼굴+이름).
 * 5인 풀팀 카드는 눌러서 그 조합이 나온 경기 기록을 펼쳐 볼 수 있다(CompMatches).
 * 데이터는 웹 조합 페이지(app/meta/comp/page.tsx)가 불러온 값을 앱 모양으로 바꿔 받는다(서버 컴포넌트).
 */
import Link from "next/link";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { AppPage, CharImg, Chip, ChipRow, GhostLink, StateBox, UltBadge, wrClass } from "../../ui";
import type { AppLinkTab } from "./AppMetaTier";
import { MetaTopBar } from "./parts";
import CompMatches from "./CompMatches";

/** 조합 카드의 캐릭터 한 칸 */
export interface AppCompMember {
  /** 캐릭터 ID */
  characterId: string;
  /** 캐릭터 이름 */
  name: string;
  /** 누르면 갈 캐릭터 상세 주소 */
  href: string;
  /** 2차 보유 캐릭터의 궁극기 표시("1차"/"2차") — 없으면 null */
  ultLabel: string | null;
  /** 역할군(공식 역할군·예전 포지션) 이름 — 5인 풀팀은 null */
  roleName: string | null;
  /** 공식 역할군이면 true (역할군 아이콘 표시) */
  officialRole: boolean;
}

/** 조합 카드 한 장 */
export interface AppCompItem {
  /** 고유 키 */
  key: string;
  /** 구성 캐릭터 */
  members: AppCompMember[];
  /** 등장 판수 */
  games: number;
  /** 승률(%) */
  winRate: number;
  /** 5인 풀팀이면 경기 기록 조회용 캐릭터 ID 목록 (듀오·트리오는 null) */
  matchIds: string[] | null;
}

/** 앱 조합 티어 화면이 받는 데이터 */
export interface AppMetaCompProps {
  /** 편성 칩 (5인 풀팀/듀오/트리오 …) */
  kindTabs: AppLinkTab[];
  /** 기준 칩 (빈도/승률) */
  basisTabs: AppLinkTab[];
  /** 역할군 칩 — 공식 역할군 듀오·트리오에서만, 아니면 null */
  roleTabs: AppLinkTab[] | null;
  /** 조합 목록 (선택 기준 순서) */
  items: AppCompItem[];
  /** 지금 기준 */
  basis: "freq" | "win";
  /** 승률순에 쓰는 최소 판수 */
  minGames: number;
  /** 목록 제목 (예: "최근 공식전 5인 조합") */
  title: string;
  /** 제목 아래 집계 설명 (팀 수·조합 종류 수 등) */
  desc: string | null;
  /** 맨 아래 기준 안내 */
  note: string;
  /** 조합 데이터를 하나도 받지 못했으면 true */
  noData: boolean;
  /** 경기 기록 조회에 쓰는 게임 타입 */
  gameTypeId: string;
}

/**
 * 조합 카드 한 장 — #순위, 승률·판수, 캐릭터 얼굴(누르면 상세).
 * @param item 조합
 * @param rank 순위(1부터)
 * @param gameTypeId 경기 기록 조회 게임 타입
 */
function CompCard({ item, rank, gameTypeId }: { item: AppCompItem; rank: number; gameTypeId: string }) {
  const five = item.members.length >= 5;
  const cols = five ? "grid-cols-5" : item.members.length === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <div className="a-card p-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`text-[15px] font-extrabold ${rank <= 3 ? "text-primary" : "text-gray-300"}`}>#{rank}</span>
        <span className="text-xs text-gray-500">
          승률 <b className={`text-sm font-extrabold ${wrClass(item.winRate)}`}>{item.winRate}%</b> · {item.games.toLocaleString()}판
        </span>
      </div>
      <div className={`mt-2.5 grid ${cols} gap-2`}>
        {item.members.map((m, i) => (
          <Link key={`${m.characterId}-${i}`} href={m.href} className="a-press grid min-w-0 justify-items-center gap-1">
            <span className="relative">
              <CharImg id={m.characterId} name={m.name} size={five ? 52 : 56} radius={14} />
              {m.ultLabel && (
                <span className="absolute -right-1.5 -top-1.5">
                  <UltBadge label={m.ultLabel} />
                </span>
              )}
            </span>
            <span className="w-full truncate text-center text-[11px] font-semibold text-gray-300">{m.name}</span>
            {m.roleName && (
              <span className="flex max-w-full items-center gap-0.5 text-[10px] text-gray-500">
                {m.officialRole && <OfficialRoleIcon role={m.roleName} size={12} />}
                <span className="truncate">{m.roleName}</span>
              </span>
            )}
          </Link>
        ))}
      </div>
      {item.matchIds && <CompMatches ids={item.matchIds} gameTypeId={gameTypeId} />}
    </div>
  );
}

/**
 * @param props 조합 티어 데이터 (AppMetaCompProps)
 */
export default function AppMetaComp({
  kindTabs,
  basisTabs,
  roleTabs,
  items,
  basis,
  minGames,
  title,
  desc,
  note,
  noData,
  gameTypeId,
}: AppMetaCompProps) {
  return (
    <div className="min-h-[100dvh]" style={{ background: "radial-gradient(120% 42% at 50% -8%, var(--a-amb), transparent 70%)" }}>
      <MetaTopBar active="comp" />
      <AppPage className="!gap-3">
        {/* 편성 */}
        {kindTabs.length > 1 && (
          <ChipRow>
            {kindTabs.map((t) => (
              <Chip key={t.key} href={t.href} active={t.active}>
                {t.label}
              </Chip>
            ))}
          </ChipRow>
        )}

        {/* 역할군(듀오·트리오) */}
        {roleTabs && (
          <ChipRow>
            {roleTabs.map((t) => (
              <Chip key={t.key} href={t.href} active={t.active} soft>
                {t.roleIcon && <OfficialRoleIcon role={t.roleIcon} size={16} />}
                {t.label}
              </Chip>
            ))}
          </ChipRow>
        )}

        {/* 제목 + 기준 */}
        <div className="flex items-end justify-between gap-2">
          <div className="grid min-w-0 gap-0.5">
            <h2 className="truncate text-[15px] font-extrabold text-gray-100">{title}</h2>
            {desc && <p className="truncate text-[11px] text-gray-500">{desc}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {basisTabs.map((b) => (
              <Link
                key={b.key}
                href={b.href}
                scroll={false}
                replace
                aria-current={b.active ? "true" : undefined}
                className={`flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${
                  b.active ? "bg-app-ac-soft text-app-ac-tx" : "text-gray-500"
                }`}
              >
                {b.label}
              </Link>
            ))}
          </div>
        </div>

        {noData ? (
          <StateBox
            icon="users"
            title="수집된 조합 데이터가 아직 없어요"
            desc="상위 랭커 경기가 모이면 자주 나온 조합이 보여요."
            action={<GhostLink href="/meta">캐릭터 티어 보기</GhostLink>}
          />
        ) : items.length === 0 ? (
          (() => {
            // 다음 할 일: 승률순이면 많이 나온 순으로, 역할군을 골랐으면 역할군 전체로, 아니면 5인 풀팀으로
            const roleOn = !!roleTabs && !roleTabs[0]?.active;
            const next =
              basis === "win"
                ? { href: basisTabs.find((b) => b.key === "freq")?.href ?? "/meta/comp", label: "많이 나온 순으로 보기" }
                : roleOn
                  ? { href: roleTabs![0].href, label: "역할군 전체 보기" }
                  : { href: kindTabs[0]?.href ?? "/meta/comp", label: "5인 풀팀 보기" };
            return (
              <StateBox
                icon="users"
                title={basis === "win" ? `${minGames}판 이상 반복된 조합이 아직 없어요` : "조건에 맞는 조합이 없어요"}
                desc={basis === "win" ? "많이 나온 순으로 보면 조합을 더 볼 수 있어요." : "다른 편성이나 역할군을 골라 보세요."}
                action={<GhostLink href={next.href}>{next.label}</GhostLink>}
              />
            );
          })()
        ) : (
          items.map((it, i) => <CompCard key={it.key} item={it} rank={i + 1} gameTypeId={gameTypeId} />)
        )}

        <p className="px-1 text-[11px] leading-relaxed text-gray-500">{note}</p>
      </AppPage>
    </div>
  );
}
