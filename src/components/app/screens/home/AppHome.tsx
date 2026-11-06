/**
 * 앱 홈 화면 (시안 01).
 *
 * 순서: 검색 진입 → 내 전적 → 즐겨찾기 → 최신 업데이트 → 지금 방송 중 → 상위 랭커 TOP 10
 *       → 역할군별 TOP3 → 5인 조합 트렌드 → 소식·커뮤니티 → 집계 숫자
 * 데이터는 웹 홈(app/page.tsx)이 불러온 값을 그대로 받는다. 기기 저장값이 필요한 부분은 HomeClient.
 */
import Link from "next/link";
import type { LiveStream } from "@/lib/live";
import type { Composition, MetaSummary } from "@/lib/meta";
import type { UpdateNote } from "@/lib/updates";
import type { PickInfo } from "@/lib/ranking-enrich";
import { AppTopBar, TopIconButton } from "../../AppChrome";
import { Icon } from "../../icons";
import { LiveCard } from "../../live";
import { AppPage, Badge, CharImg, SectionHead, StateBox, GhostLink, tierKo, wrClass } from "../../ui";
import { HomeFavs, HomeMyCard, HomeNews, HomeRoleTop3, HomeSearchEntry, type NewsItem, type RoleTopGroup } from "./HomeClient";

/** 상위 랭커 카드 한 장 */
export interface HomeRanker {
  /** 순위 */
  rank: number;
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 티어 이름 */
  tierName: string | null;
  /** RP */
  rp: number;
  /** 최근 공식전 승률(%) — 표본 없으면 null */
  winRate: number | null;
  /** 최근 많이 고른 캐릭터 (최대 3) */
  picks: PickInfo[];
}

/** 앱 홈이 받는 데이터 */
export interface AppHomeProps {
  /** 상위 랭커 TOP 10 */
  rankers: HomeRanker[];
  /** 역할군별 TOP3 묶음 */
  roleGroups: RoleTopGroup[];
  /** 5인 조합 (많이 나온 순) */
  comps: Composition[];
  /** 공지 */
  notices: NewsItem[];
  /** 최근 글 */
  recent: NewsItem[];
  /** 지금 방송 중 */
  lives: LiveStream[];
  /** 최신 업데이트 노트 */
  latestUpdate: UpdateNote | null;
  /** 집계 숫자 */
  summary: MetaSummary | null;
}

/**
 * @param props 홈 데이터 (AppHomeProps)
 */
export default function AppHome({ rankers, roleGroups, comps, notices, recent, lives, latestUpdate, summary }: AppHomeProps) {
  const now = Date.now();
  return (
    <div
      className="min-h-[100dvh]"
      style={{ background: "radial-gradient(120% 42% at 50% -8%, var(--a-amb), transparent 70%)" }}
    >
      <AppTopBar variant="home" right={<TopIconButton icon="bell" label="알림" href="/notifications" />} />
      <AppPage>
        <HomeSearchEntry />
        <HomeMyCard />
        <HomeFavs />

        {latestUpdate && (
          <Link
            href={`/updates/${latestUpdate.id}`}
            className="a-tile a-press flex items-center gap-2.5 px-3.5 py-3 text-xs shadow-[var(--a-shadow)]"
          >
            {latestUpdate.version && <Badge tone="soft">{latestUpdate.version}</Badge>}
            <span className="min-w-0 flex-1 truncate text-gray-300">{latestUpdate.title}</span>
            <span className="text-gray-500">
              <Icon name="chevronRight" size={14} />
            </span>
          </Link>
        )}

        {/* 지금 방송 중 */}
        <section className="grid grid-cols-1 gap-2.5">
          <SectionHead
            title="지금 방송 중"
            sub={lives.length > 0 ? lives.length : undefined}
            lead={<span className="h-[7px] w-[7px] rounded-full bg-app-live" />}
            href="/videos"
          />
          {lives.length === 0 ? (
            <StateBox
              icon="video"
              title="지금 방송 중인 사이퍼즈 방송이 없어요"
              desc="지난 동영상은 방송·동영상 화면에서 볼 수 있어요."
              action={<GhostLink href="/videos?tab=videos">동영상 보기</GhostLink>}
            />
          ) : (
            <div className="a-hscroll a-bleed gap-2.5">
              {lives.map((s) => (
                <LiveCard key={s.id} s={s} now={now} />
              ))}
            </div>
          )}
        </section>

        {/* 상위 랭커 TOP 10 */}
        <section className="grid grid-cols-1 gap-2.5">
          <SectionHead title="상위 랭커 TOP 10" href="/ranking" cta="전체 순위" />
          {rankers.length === 0 ? (
            <StateBox kind="error" title="랭킹을 불러오지 못했어요" desc="잠시 뒤 다시 열어 주세요." action={<GhostLink href="/ranking" icon="refresh">랭킹 화면 열기</GhostLink>} />
          ) : (
            <div className="a-hscroll a-bleed gap-2.5">
              {rankers.map((k) => (
                <Link
                  key={k.playerId}
                  href={`/players/${k.playerId}`}
                  className="a-card a-press grid w-[148px] shrink-0 grid-cols-1 gap-2 p-3"
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold ${
                        k.rank === 1 ? "a-grad" : "bg-app-ac-soft text-app-ac-tx"
                      }`}
                    >
                      {k.rank}
                    </span>
                    {k.tierName && <Badge tone="soft">{tierKo(k.tierName)}</Badge>}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <CharImg id={k.picks[0]?.characterId} name={k.picks[0]?.characterName ?? k.nickname} size={36} radius={10} />
                    <span className="grid min-w-0">
                      <span className="truncate text-sm font-bold text-gray-100">{k.nickname}</span>
                      <span className={`text-[11px] ${wrClass(k.winRate)}`}>
                        {k.winRate !== null ? `승률 ${k.winRate}%` : "승률 -"}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="text-xl font-extrabold tracking-[-0.02em] text-primary">{k.rp.toLocaleString()}</span>
                    <span className="text-[11px] font-semibold text-gray-500">RP</span>
                  </span>
                  {k.picks.length > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-500">최근 픽</span>
                      {k.picks.slice(0, 3).map((p) => (
                        <CharImg key={p.characterId} id={p.characterId} name={p.characterName} size={20} radius={6} />
                      ))}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* 역할군별 캐릭터 TOP3 */}
        {roleGroups.length > 0 ? (
          <HomeRoleTop3 groups={roleGroups} />
        ) : (
          <StateBox title="캐릭터 통계를 모으는 중이에요" desc="표본이 쌓이면 역할군별 TOP3 가 보여요." icon="bars" />
        )}

        {/* 5인 조합 트렌드 */}
        <section className="grid grid-cols-1 gap-2.5">
          <SectionHead title="5인 조합 트렌드" href="/meta/comp" cta="조합 티어" />
          {comps.length === 0 ? (
            <StateBox title="수집된 조합 데이터가 아직 없어요" icon="users" />
          ) : (
            comps.slice(0, 3).map((c, i) => (
              <Link key={c.ids.join("-")} href="/meta/comp" className="a-tile a-press flex items-center gap-2.5 px-3 py-2.5">
                <span className="w-4 text-center text-sm font-extrabold text-primary">{i + 1}</span>
                <span className="flex min-w-0 flex-1 gap-1">
                  {c.ids.map((id, j) => (
                    <CharImg key={`${id}-${j}`} id={id} name={c.names[j]} size={40} radius={10} />
                  ))}
                </span>
                <span className="grid shrink-0 justify-items-end">
                  <span className={`text-[15px] font-extrabold ${wrClass(c.winRate)}`}>{c.winRate}%</span>
                  <span className="text-[10px] text-gray-500">{c.games}판</span>
                </span>
              </Link>
            ))
          )}
        </section>

        <HomeNews notices={notices} recent={recent} />

        {summary && (
          <footer className="grid justify-items-center gap-1 pt-1 text-center">
            <p className="text-xs text-gray-500">
              수집 매치 <b className="text-gray-300">{summary.matches.toLocaleString()}</b>
              <span className="mx-1.5">·</span>캐릭터 <b className="text-gray-300">{summary.characters}</b>
              <span className="mx-1.5">·</span>플레이 기록 <b className="text-gray-300">{summary.playerRecords.toLocaleString()}</b>
            </p>
            <p className="text-[10px] text-gray-500">공식전 상위 랭커 기준 · 데이터 제공 Neople 오픈 API</p>
          </footer>
        )}
      </AppPage>
    </div>
  );
}
