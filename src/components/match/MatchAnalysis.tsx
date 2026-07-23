import { Avatar } from "@/components/CharacterAvatar";
import { formatNumber } from "@/lib/format";
import type { MatchDetailPlayer, MatchDetailTeam, MatchPlayInfo } from "@/lib/types";

/**
 * 팀 전투 분석 — 매치 상세에 이미 담긴 플레이어별 스탯을 6개 지표로 비교.
 * 좌(내 팀/1팀, 파랑) vs 우(상대 팀/2팀, 빨강), 가운데 도넛은 팀 합계.
 */

type MetricKey = keyof MatchPlayInfo;

const METRICS: { key: MetricKey; label: string }[] = [
  { key: "killCount", label: "킬" },
  { key: "getCoin", label: "골드 획득량" },
  { key: "attackPoint", label: "가한 피해량" },
  { key: "damagePoint", label: "받은 피해량" },
  { key: "sightPoint", label: "시야" },
  { key: "healAmount", label: "힐량" },
];

const BLUE = "#4f8ff0";
const RED = "#ff5470";

function val(p: MatchDetailPlayer, key: MetricKey): number {
  const v = p.playInfo?.[key];
  return typeof v === "number" ? v : 0;
}
function teamSum(team: MatchDetailTeam, key: MetricKey): number {
  return team.players.reduce((s, p) => s + val(p, key), 0);
}

function Donut({ a, b }: { a: number; b: number }) {
  const total = a + b || 1;
  const r = 28;
  const c = 2 * Math.PI * r;
  const fa = a / total;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0">
      <g transform="rotate(-90 42 42)">
        <circle cx="42" cy="42" r={r} fill="none" stroke={RED} strokeWidth="9" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={BLUE}
          strokeWidth="9"
          strokeDasharray={`${(c * fa).toFixed(2)} ${c.toFixed(2)}`}
        />
      </g>
      <text x="42" y="39" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={BLUE}>
        {formatNumber(a)}
      </text>
      <text x="42" y="53" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={RED}>
        {formatNumber(b)}
      </text>
    </svg>
  );
}

function Row({
  p,
  v,
  max,
  color,
  side,
}: {
  p: MatchDetailPlayer;
  v: number;
  max: number;
  color: string;
  side: "left" | "right";
}) {
  const w = max > 0 ? Math.max((v / max) * 100, v > 0 ? 4 : 0) : 0;
  const name = p.nickname || p.playInfo?.characterName || "-";
  const avatar = (
    <Avatar
      characterId={p.playInfo?.characterId}
      characterName={p.playInfo?.characterName ?? p.nickname}
      size={24}
      zoom={1}
    />
  );
  const valueEl = (
    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-gray-300">
      {formatNumber(v)}
    </span>
  );
  const nameEl = (
    <span
      className={`min-w-0 flex-1 truncate text-[11px] text-gray-400 ${
        side === "right" ? "text-right" : ""
      }`}
    >
      {name}
    </span>
  );
  const bar = (
    <div className="mt-1 h-2 overflow-hidden rounded bg-surface-2">
      <div
        className="h-full rounded"
        style={{ width: `${w}%`, backgroundColor: color, marginLeft: side === "right" ? "auto" : undefined }}
      />
    </div>
  );
  const body = (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        {side === "left" ? (
          <>
            {nameEl}
            {valueEl}
          </>
        ) : (
          <>
            {valueEl}
            {nameEl}
          </>
        )}
      </div>
      {bar}
    </div>
  );
  return (
    <div className="flex items-center gap-2" title={name}>
      {side === "left" ? (
        <>
          {avatar}
          {body}
        </>
      ) : (
        <>
          {body}
          {avatar}
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  left,
  right,
  mkey,
}: {
  label: string;
  left: MatchDetailTeam;
  right: MatchDetailTeam;
  mkey: MetricKey;
}) {
  const leftVals = left.players.map((p) => val(p, mkey));
  const rightVals = right.players.map((p) => val(p, mkey));
  const max = Math.max(1, ...leftVals, ...rightVals);
  return (
    <div className="card p-3.5">
      <h4 className="mb-3 text-center text-sm font-bold text-gray-200">{label}</h4>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className="space-y-1.5">
          {left.players.map((p, i) => (
            <Row key={`${p.playerId}-${i}`} p={p} v={leftVals[i]} max={max} color={BLUE} side="left" />
          ))}
        </div>
        <Donut a={teamSum(left, mkey)} b={teamSum(right, mkey)} />
        <div className="space-y-1.5">
          {right.players.map((p, i) => (
            <Row key={`${p.playerId}-${i}`} p={p} v={rightVals[i]} max={max} color={RED} side="right" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MatchAnalysis({
  teams,
  highlightPlayerId,
}: {
  teams: MatchDetailTeam[];
  highlightPlayerId?: string;
}) {
  if (teams.length < 2) {
    return (
      <p className="card p-6 text-center text-sm text-gray-500">분석할 팀 데이터가 부족합니다.</p>
    );
  }
  const inTeam1 = !!highlightPlayerId && teams[1].players.some((p) => p.playerId === highlightPlayerId);
  const inTeam0 = !!highlightPlayerId && teams[0].players.some((p) => p.playerId === highlightPlayerId);
  const left = inTeam1 ? teams[1] : teams[0];
  const right = inTeam1 ? teams[0] : teams[1];
  const mine = inTeam0 || inTeam1;
  const leftLabel = mine ? "내 팀" : "1팀";
  const rightLabel = mine ? "상대 팀" : "2팀";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4 text-xs font-semibold text-gray-300">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BLUE }} />
          {leftLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RED }} />
          {rightLabel}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {METRICS.map((m) => (
          <MetricCard key={m.key as string} label={m.label} left={left} right={right} mkey={m.key} />
        ))}
      </div>
    </div>
  );
}
