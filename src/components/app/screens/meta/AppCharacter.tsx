/**
 * 앱 캐릭터 상세 화면 (시안 07).
 *
 * 구성: 큰 캐릭터 그림 머리(투명 상단바 + 뒤로) — 티어·역할군, 이름·궁극기, 1차/2차 전환, 픽률·승률·KDA·역할군 순위
 *       → 정보·빌드·랭커 세그먼트(CharTabs)
 *         - 정보: 궁극기 선택 비율(또는 궁극기·역할군), 능력치, 역할군 고정 버프, 스킬(눌러서 설명 펼침)
 *         - 빌드: 부위별 채택률 1위(추천 빌드), 슬롯별 채택률 상세
 *         - 랭커: 지표 칩(승리 수·승률 …) + 이 캐릭터 상위 랭커 20명 + 전체 랭킹 링크
 * 데이터는 웹 캐릭터 상세(app/characters/[characterId]/page.tsx)가 불러온 값을 앱 모양으로 바꿔 받는다(서버 컴포넌트).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { Tier } from "@/lib/meta";
import { characterImage } from "@/lib/images";
import SafeImage from "@/components/SafeImage";
import ItemIcon from "@/components/ItemIcon";
import { OfficialRoleIcon } from "@/components/characters/OfficialRoleIcon";
import { AppTopBar } from "../../AppChrome";
import { Icon } from "../../icons";
import { AppPage, Chip, ChipRow, GhostLink, StateBox, UltBadge, wrClass } from "../../ui";
import type { AppLinkTab } from "./AppMetaTier";
import { Bar, TierBadge, skillKeyLabel } from "./parts";
import { CharTabs, UltSwitch } from "./CharClient";

/** 궁극기 한 종 (선택 비율 카드·전환용) */
export interface AppUltInfo {
  /** 궁극기 구분 */
  type: "1st" | "2nd";
  /** "1차" | "2차" */
  label: string;
  /** 궁극기 스킬 이름 */
  skillName: string;
  /** 이 궁극기를 고르면 정해지는 공식 역할군 이름 */
  roleName: string;
  /** 역할군 설명 (없으면 null) */
  roleDesc: string | null;
  /** 이 궁극기 판의 픽률(%) — 표본 없으면 null */
  pickRate: number | null;
  /** 이 궁극기 판의 승률(%) — 표본 없으면 null */
  winRate: number | null;
  /** 이 캐릭터 판 중 이 궁극기를 고른 비율(%) — 표본 없으면 null */
  share: number | null;
}

/** 능력치 한 칸 */
export interface AppStatInfo {
  /** 능력치 이름 (공격·체력 …) */
  label: string;
  /** 표시 값 */
  value: string;
  /** 막대 비율(0~100) */
  pct: number;
}

/** 스킬 한 줄 */
export interface AppSkillInfo {
  /** 조작 키 원문 (LMB, Q …) */
  slot: string;
  /** 스킬 이름 */
  name: string;
  /** 쿨타임 원문 ("16.50초") — 없으면 null */
  cooldown: string | null;
  /** 소모 자원 — 없으면 null */
  cost: string | null;
  /** 설명 */
  explain: string;
  /** 궁극기 전용 스킬이면 "1차"/"2차" — 공통 스킬은 null */
  ultLabel: string | null;
}

/** 빌드 슬롯 한 칸 */
export interface AppSlotInfo {
  /** 슬롯 코드 (키) */
  code: string;
  /** 슬롯 이름 (장갑·모자·장신구1 …) */
  label: string;
  /** 채택률 높은 순 아이템 */
  items: { itemId: string; name: string | null; rarityCode: string | null; rate: number }[];
}

/** 랭커 한 줄 */
export interface AppCharRanker {
  /** 순위 */
  rank: number;
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 지표 값 표시 글자 */
  value: string;
  /** 승패 표시 ("12승 3패 · 80%") — 모르면 null */
  record: string | null;
}

/** 앱 캐릭터 상세가 받는 데이터 */
export interface AppCharacterProps {
  /** 캐릭터 ID */
  characterId: string;
  /** 캐릭터 이름 (모르면 null) */
  name: string | null;
  /** 한 줄 소개 (모르면 null) */
  intro: string | null;
  /** 데이터 티어 (종합 기준, 표본 없으면 null) */
  tier: Tier | null;
  /** 역할군 이름 (공식 역할군 또는 예전 포지션) */
  roleName: string | null;
  /** 공식 역할군이면 true (아이콘 표시) */
  officialRole: boolean;
  /** 역할군 안 순위 (종합 기준) — 모르면 null */
  roleRank: { rank: number; total: number } | null;
  /** 머리 지표 (선택 궁극기 또는 캐릭터 합산) — 표본 없으면 null */
  head: { pickRate: number; winRate: number; kda: number; picks: number } | null;
  /** 2차 궁극기 보유 캐릭터면 true */
  dual: boolean;
  /** 지금 보는 궁극기 (2차 보유 캐릭터만, 아니면 null) */
  selectedUlt: "1st" | "2nd" | null;
  /** 궁극기 목록 (공식 역할군 체계, 1~2개) */
  ultimates: AppUltInfo[];
  /** 공격 방식 (근거리/원거리) */
  attackType: string | null;
  /** 난이도 (1~5) */
  difficulty: number | null;
  /** 능력치 (정적 데이터가 없으면 빈 배열) */
  stats: AppStatInfo[];
  /** 스킬 (선택 궁극기 기준) */
  skills: AppSkillInfo[];
  /** 역할군 고정 버프 (공식 역할군 체계에서만) */
  buff: { roleKey: string; roleName: string; buffs: string[]; when: string } | null;
  /** 아이템 통계 표본 수 (없으면 null) */
  buildPicks: number | null;
  /** 슬롯별 아이템 채택률 */
  slots: AppSlotInfo[];
  /** 빌드·채택률이 어느 궁극기 기준인지 ("2차 궁극기 구마의 손길") — 분리 안 하면 null */
  ultTag: string | null;
  /** 랭커 지표 칩 */
  metricTabs: AppLinkTab[];
  /** 지금 지표 이름 */
  metricLabel: string;
  /** 랭커 목록 */
  rankers: AppCharRanker[];
  /** 랭커를 불러오지 못했을 때 안내 (정상이면 null) */
  rankerError: string | null;
  /** 이 캐릭터 전체 랭킹 주소 */
  allRankHref: string;
  /** 랭커 다시 불러오기 주소 */
  rankRetryHref: string;
}

/**
 * 쿨타임 글자를 짧게 바꾼다. ("16.50초" → "16.5초", "0.00초" → "없음")
 * @param cd 쿨타임 원문
 */
function cdText(cd: string): string {
  const n = parseFloat(cd);
  if (Number.isNaN(n)) return cd;
  if (n === 0) return "없음";
  return `${Number(n.toFixed(2))}초`;
}

/**
 * 카드 제목 줄.
 * @param title 제목
 * @param sub 오른쪽 회색 보조 글자
 */
function CardHead({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h3 className="flex min-w-0 items-center gap-1.5 text-base font-extrabold text-gray-100">{title}</h3>
      {sub && <span className="shrink-0 text-[11px] text-gray-500">{sub}</span>}
    </div>
  );
}

/* ── 정보 칸 ─────────────────────────────────── */

/**
 * 정보 칸 — 궁극기, 능력치, 고정 버프, 스킬.
 * @param p 상세 데이터
 */
function InfoPanel(p: AppCharacterProps) {
  const totalShare = p.ultimates.reduce((n, u) => n + (u.share ?? 0), 0);
  return (
    <>
      {/* 궁극기 선택 비율 (2차 보유) */}
      {p.dual && p.ultimates.length > 1 && (
        <section className="a-card p-4">
          <CardHead title="궁극기 선택 비율" />
          {totalShare > 0 && (
            <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
              {p.ultimates.map((u) => (
                <span
                  key={u.type}
                  className={u.type === "1st" ? "a-grad" : "bg-app-ac-soft"}
                  style={{ width: `${((u.share ?? 0) / totalShare) * 100}%` }}
                />
              ))}
            </div>
          )}
          <div className="mt-2.5 grid gap-1">
            {p.ultimates.map((u) => (
              <div
                key={u.type}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] px-2 py-1.5 ${
                  u.type === p.selectedUlt ? "bg-surface-2" : ""
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <UltBadge label={u.label} />
                  <span className="truncate text-[13px] font-bold text-gray-100">{u.skillName}</span>
                  <OfficialRoleIcon role={u.roleName} size={13} />
                  <span className="shrink-0 text-[11px] text-gray-500">{u.roleName}</span>
                </span>
                <span className="flex items-center gap-2 text-[11px] tabular-nums text-gray-500">
                  <span>선택 {u.share != null ? `${u.share}%` : "-"}</span>
                  <span>픽 {u.pickRate != null ? `${u.pickRate}%` : "-"}</span>
                  <span className={`font-bold ${wrClass(u.winRate)}`}>승 {u.winRate != null ? `${u.winRate}%` : "-"}</span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">판마다 장착 아이템으로 1차/2차를 판별해 따로 모아요.</p>
        </section>
      )}

      {/* 궁극기 · 공식 역할군 (1차만 있는 캐릭터) */}
      {!p.dual && p.ultimates.length === 1 && (
        <section className="a-card p-4">
          <CardHead title="궁극기 · 공식 역할군" sub="궁극기 1종" />
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-100">{p.ultimates[0].skillName}</span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-gray-300">
              <OfficialRoleIcon role={p.ultimates[0].roleName} size={14} />
              {p.ultimates[0].roleName}
            </span>
          </div>
          {p.ultimates[0].roleDesc && <p className="mt-2 text-xs leading-relaxed text-gray-500">{p.ultimates[0].roleDesc}</p>}
        </section>
      )}

      {/* 능력치 */}
      {p.stats.length > 0 ? (
        <section className="a-card p-4">
          <CardHead
            title="능력치"
            sub={[p.attackType, p.difficulty ? `난이도 ${p.difficulty}/5` : null].filter(Boolean).join(" · ") || undefined}
          />
          <div className="grid grid-cols-2 gap-2">
            {p.stats.map((s) => (
              <div key={s.label} className="grid gap-1.5 rounded-[12px] bg-surface-2 px-3 py-2.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className="text-sm font-extrabold tabular-nums text-gray-100">{s.value}</span>
                </span>
                <Bar pct={s.pct} className="h-1" />
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-gray-500">기본 능력치는 1차/2차 궁극기 공통이에요 · 공식 사이트 기준</p>
        </section>
      ) : (
        <StateBox icon="info" title="능력치·스킬 정보가 아직 없어요" desc="빌드와 랭커 칸에서 통계를 볼 수 있어요." />
      )}

      {/* 역할군 고정 버프 */}
      {p.buff && (
        <section className="a-card p-4">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2">
              <OfficialRoleIcon role={p.buff.roleKey} size={22} />
            </span>
            <span className="grid min-w-0">
              <span className="truncate text-base font-extrabold text-gray-100">{p.buff.roleName} 고정 버프</span>
              <span className="text-[11px] text-gray-500">{p.buff.when}</span>
            </span>
          </div>
          <ul className="grid gap-1.5">
            {p.buff.buffs.map((b) => (
              <li key={b} className="flex gap-2 text-[13px] leading-relaxed text-gray-300">
                <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-gray-500" aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 스킬 */}
      {p.skills.length > 0 && (
        <section className="a-card p-4">
          <CardHead title="스킬" sub={`${p.skills.length}개 · 눌러서 설명 보기`} />
          <div className="grid gap-1">
            {p.skills.map((sk, i) => (
              <details key={`${sk.slot}-${i}`} className="group rounded-[12px] open:bg-surface-2">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-1.5 py-1.5 [&::-webkit-details-marker]:hidden">
                  <span className="grid h-7 w-[86px] shrink-0 place-items-center truncate rounded-lg bg-surface-2 px-1 text-[11px] font-bold text-gray-300 group-open:bg-surface">
                    {skillKeyLabel(sk.slot)}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-bold leading-snug text-gray-100">{sk.name}</span>
                  {sk.ultLabel && <UltBadge label={sk.ultLabel} />}
                  {sk.cooldown && <span className="shrink-0 text-[11px] tabular-nums text-gray-500">쿨 {cdText(sk.cooldown)}</span>}
                  <span className="shrink-0 text-gray-500 transition-transform group-open:rotate-180">
                    <Icon name="chevronDown" size={14} />
                  </span>
                </summary>
                <div className="px-2.5 pb-2.5 pt-0.5">
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-gray-300">{sk.explain}</p>
                  {sk.cost && <p className="mt-1 text-[11px] text-gray-500">소모 {sk.cost}</p>}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ── 빌드 칸 ─────────────────────────────────── */

/**
 * 빌드 칸 — 추천 빌드(부위별 1위)와 슬롯별 채택률 상세.
 * @param p 상세 데이터
 */
function BuildPanel(p: AppCharacterProps) {
  if (p.slots.length === 0) {
    return (
      <StateBox
        icon="grid"
        title="아이템 통계가 아직 없어요"
        desc="이 캐릭터 경기가 더 모이면 부위별 채택률이 보여요."
        action={<GhostLink href="/meta">캐릭터 티어 보기</GhostLink>}
      />
    );
  }
  return (
    <>
      <section className="a-card p-4">
        <CardHead title="추천 빌드" sub="부위별 채택률 1위" />
        {p.ultTag && (
          <p className="mb-2.5 inline-flex rounded-md bg-app-ac-soft px-2 py-0.5 text-[11px] font-semibold text-app-ac-tx">{p.ultTag}</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {p.slots.map((s) => {
            const top = s.items[0];
            if (!top) return null;
            return (
              <div key={s.code} className="flex min-w-0 items-center gap-2.5 rounded-[12px] bg-surface-2 p-2.5">
                <ItemIcon itemId={top.itemId} itemName={top.name ?? undefined} rarityCode={top.rarityCode ?? undefined} size={36} linkable={false} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-[10px] text-gray-500">{s.label}</span>
                  <span className="truncate text-xs font-bold text-gray-100">{top.name ?? top.itemId}</span>
                  <span className="flex items-center gap-1.5">
                    <Bar pct={top.rate} className="h-1 flex-1" />
                    <span className="shrink-0 text-[10px] font-bold tabular-nums text-primary">{top.rate}%</span>
                  </span>
                </span>
              </div>
            );
          })}
        </div>
        {p.buildPicks != null && (
          <p className="mt-2.5 text-[11px] text-gray-500">
            표본 {p.buildPicks.toLocaleString()}판 · 수집한 공식전 경기의 마지막 장착 아이템 기준
          </p>
        )}
      </section>

      <section className="a-card p-4">
        <CardHead title="슬롯별 채택률 상세" sub="부위마다 상위 4개" />
        <div className="grid gap-3.5">
          {p.slots.map((s) => (
            <div key={s.code} className="grid gap-1.5">
              <span className="text-xs font-bold text-gray-300">{s.label}</span>
              {s.items.slice(0, 4).map((it, i) => (
                <div key={it.itemId} className="grid grid-cols-[14px_26px_minmax(0,1fr)_64px_40px] items-center gap-2">
                  <span className="text-center text-[11px] font-bold text-gray-500">{i + 1}</span>
                  <ItemIcon itemId={it.itemId} itemName={it.name ?? undefined} rarityCode={it.rarityCode ?? undefined} size={26} linkable={false} />
                  <span className="truncate text-[13px] text-gray-200">{it.name ?? it.itemId}</span>
                  <Bar pct={it.rate} className="h-1.5" tone={i === 0 ? "grad" : "mute"} />
                  <span className={`text-right text-xs font-bold tabular-nums ${i === 0 ? "text-primary" : "text-gray-300"}`}>{it.rate}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/* ── 랭커 칸 ─────────────────────────────────── */

/**
 * 랭커 칸 — 지표 칩 + 상위 랭커 목록 + 전체 랭킹 링크.
 * @param p 상세 데이터
 */
function RankPanel(p: AppCharacterProps) {
  return (
    <>
      <ChipRow>
        {p.metricTabs.map((t) => (
          <Chip key={t.key} href={t.href} active={t.active} soft>
            {t.label}
          </Chip>
        ))}
      </ChipRow>
      <p className="px-1 text-[11px] text-gray-500">
        네오플 공식 캐릭터 랭킹 기준{p.dual ? " · 1차/2차 구분 없음" : ""} · {p.metricLabel} 상위 {p.rankers.length || 20}명
      </p>
      {p.rankerError ? (
        <StateBox
          kind="error"
          title="랭커를 불러오지 못했어요"
          desc={p.rankerError}
          action={
            <GhostLink href={p.rankRetryHref} icon="refresh">
              다시 불러오기
            </GhostLink>
          }
        />
      ) : p.rankers.length === 0 ? (
        <StateBox icon="trophy" title="랭킹 데이터가 없어요" desc="다른 지표를 골라 보세요." />
      ) : (
        <ol className="a-card divide-y divide-app-hair overflow-hidden">
          {p.rankers.map((r) => (
            <li key={r.playerId}>
              <Link href={`/players/${r.playerId}`} className="flex items-center gap-3 px-3.5 py-2.5 active:bg-surface-2">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold tabular-nums ${
                    r.rank === 1 ? "a-grad" : r.rank <= 3 ? "bg-app-ac-soft text-app-ac-tx" : "text-gray-500"
                  }`}
                >
                  {r.rank}
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate text-sm font-bold text-gray-100">{r.nickname}</span>
                  {r.record && <span className="truncate text-[11px] text-gray-500">{r.record}</span>}
                </span>
                <span className="shrink-0 text-sm font-extrabold tabular-nums text-primary">{r.value}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <div className="flex justify-center">
        <GhostLink href={p.allRankHref} icon="trophy">
          {p.name ?? "캐릭터"} 전체 랭킹 보기
        </GhostLink>
      </div>
    </>
  );
}

/* ── 화면 ────────────────────────────────────── */

/**
 * @param p 캐릭터 상세 데이터 (AppCharacterProps)
 */
export default function AppCharacter(p: AppCharacterProps) {
  // 이름도 통계도 없으면 없는 캐릭터 — 막다른 화면 대신 목록으로 안내
  if (!p.name && !p.head) {
    return (
      <div className="min-h-[100dvh]">
        <AppTopBar variant="back" title="캐릭터" backHref="/meta" />
        <AppPage>
          <StateBox
            title="캐릭터 정보를 찾을 수 없어요"
            desc="주소가 바뀌었거나 아직 정보가 없는 캐릭터예요."
            action={
              <span className="flex flex-wrap justify-center gap-2">
                <GhostLink href="/characters">캐릭터 목록</GhostLink>
                <GhostLink href="/meta">캐릭터 티어</GhostLink>
              </span>
            }
          />
        </AppPage>
      </div>
    );
  }
  const sel = p.ultimates.find((u) => u.type === p.selectedUlt) ?? (p.ultimates.length === 1 ? p.ultimates[0] : undefined);
  return (
    <div className="min-h-[100dvh]">
      <AppTopBar variant="back" transparent title={p.name} backHref="/meta" />

      {/* 머리 — 큰 캐릭터 그림 위에 이름·지표 */}
      <section className="relative overflow-hidden" style={{ marginTop: "calc(-52px - env(safe-area-inset-top))" }}>
        <div className="absolute inset-0 bg-app-hero" aria-hidden="true" />
        <div className="absolute -right-[12%] top-0 h-full w-[88%]" aria-hidden="true">
          <SafeImage
            src={characterImage(p.characterId, 3)}
            alt=""
            fallbackText=""
            className="h-full w-full object-cover object-top"
            fallbackClassName="!bg-transparent"
          />
        </div>
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(90deg, rgb(var(--bg)) 6%, rgb(var(--bg) / .55) 46%, rgb(var(--bg) / 0) 78%), linear-gradient(0deg, rgb(var(--bg)) 2%, rgb(var(--bg) / 0) 58%), linear-gradient(180deg, rgb(var(--bg) / .6), rgb(var(--bg) / 0) 26%)",
          }}
        />
        <div className="relative grid gap-2.5 px-4 pb-4" style={{ paddingTop: "calc(52px + env(safe-area-inset-top) + 44px)" }}>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-gray-200">
            {p.tier && <TierBadge tier={p.tier} size="lg" />}
            {p.roleName && (
              <span className="flex items-center gap-1">
                {p.officialRole && <OfficialRoleIcon role={p.roleName} size={16} />}
                {p.roleName}
              </span>
            )}
            {p.attackType && <span className="text-gray-500">· {p.attackType}</span>}
          </div>
          <div className="grid gap-0.5">
            <h1 className="flex flex-wrap items-center gap-2 text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-gray-50">
              {p.name ?? "캐릭터"}
              {p.dual && sel && <UltBadge label={sel.label} />}
            </h1>
            {(sel || p.intro) && (
              <p className="truncate text-xs text-gray-300">
                {sel ? `궁극기 ${sel.skillName}` : ""}
                {sel && p.intro ? " · " : ""}
                {p.intro ?? ""}
              </p>
            )}
          </div>

          {p.dual && p.selectedUlt && p.ultimates.length > 1 && (
            <div className="max-w-[300px]">
              <UltSwitch value={p.selectedUlt} items={p.ultimates.map((u) => ({ key: u.type, label: `${u.label} · ${u.skillName}` }))} />
            </div>
          )}

          {p.head ? (
            <>
              <div className="mt-1 grid grid-cols-4 gap-2">
                <span className="grid gap-0.5">
                  <span className="text-[11px] text-gray-500">픽률</span>
                  <span className="text-xl font-extrabold tabular-nums text-gray-50">{p.head.pickRate}%</span>
                </span>
                <span className="grid gap-0.5">
                  <span className="text-[11px] text-gray-500">승률</span>
                  <span className={`text-xl font-extrabold tabular-nums ${wrClass(p.head.winRate)}`}>{p.head.winRate}%</span>
                </span>
                <span className="grid gap-0.5">
                  <span className="text-[11px] text-gray-500">KDA</span>
                  <span className="text-xl font-extrabold tabular-nums text-gray-50">{p.head.kda.toFixed(2)}</span>
                </span>
                <span className="grid gap-0.5">
                  <span className="text-[11px] text-gray-500">역할군 순위</span>
                  <span className="text-xl font-extrabold tabular-nums text-gray-50">
                    {p.roleRank ? (
                      <>
                        {p.roleRank.rank}위<span className="ml-0.5 text-[11px] font-semibold text-gray-500">/{p.roleRank.total}</span>
                      </>
                    ) : (
                      "-"
                    )}
                  </span>
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                표본 {p.head.picks.toLocaleString()}판 · 공식전 수집 경기{p.dual && sel ? ` · ${sel.label} 궁극기 판만` : ""}
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-500">아직 이 캐릭터의 수집된 경기가 없어요.</p>
          )}
        </div>
      </section>

      <AppPage>
        <CharTabs info={<InfoPanel {...p} />} build={<BuildPanel {...p} />} rank={<RankPanel {...p} />} />
      </AppPage>
    </div>
  );
}
