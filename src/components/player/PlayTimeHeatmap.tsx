import { HEAT_HOURS, type PlayTimeHeat } from "@/lib/profile";

/** 게임 수 → primary(파랑) 농도 (테마 변수 기반, 다크모드 적응) */
function cellColor(count: number, max: number): string {
  if (count === 0 || max === 0) return "rgb(var(--surface-2))";
  const t = count / max;
  const alpha = 0.18 + t * 0.82;
  return `rgb(var(--primary) / ${alpha.toFixed(2)})`;
}

export default function PlayTimeHeatmap({ heat }: { heat: PlayTimeHeat }) {
  const rows = [
    { label: "평일", cells: heat.grid[0] },
    { label: "주말", cells: heat.grid[1] },
  ];
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-100">주 플레이 시간대</h3>
        <span className="text-xs text-gray-500">최근 {heat.total}게임</span>
      </div>

      {heat.total === 0 ? (
        <p className="text-xs text-gray-500">시간대 데이터가 없습니다.</p>
      ) : (
        <div className="space-y-1.5">
          {/* 시간 눈금 */}
          <div className="flex items-center gap-1 pl-8 text-[9px] text-gray-500">
            {HEAT_HOURS.map((h) => (
              <span key={h} className="flex-1 text-center">
                {h}
              </span>
            ))}
          </div>

          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-1">
              <span className="w-7 shrink-0 text-xs text-gray-400">{r.label}</span>
              {r.cells.map((count, i) => (
                <div
                  key={i}
                  title={`${r.label} ${HEAT_HOURS[i]}~${HEAT_HOURS[i] + 3}시 · ${count}게임`}
                  className="flex-1 rounded-sm"
                  style={{ height: 22, backgroundColor: cellColor(count, heat.max) }}
                />
              ))}
            </div>
          ))}

          {/* 범례 */}
          <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-gray-500">
            <span>적음</span>
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: cellColor(0, 1) }}
            />
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: "rgb(var(--primary) / 0.5)" }}
            />
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: "rgb(var(--primary))" }}
            />
            <span>많음</span>
          </div>
        </div>
      )}
    </div>
  );
}
