import type { RecentSummary } from "@/lib/profile";

const TONE: Record<string, string | undefined> = {
  good: "rgb(var(--win))",
  bad: "rgb(var(--lose))",
  neutral: undefined,
};

/** 주 플레이 시간대 아래 — 현재 탭 기준 최근 전적 AI 분석(서술 + 지표 타일) */
export default function RecentSummaryCard({ summary }: { summary: RecentSummary }) {
  if (summary.sample === 0) return null;
  return (
    <section className="relative overflow-hidden rounded-xl border border-line bg-surface p-4 sm:p-5">
      {/* AI 느낌의 상단 그라데이션 악센트 */}
      <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent" />
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">✨</span>
          <h2 className="text-base font-bold text-gray-100">AI 전적 분석</h2>
          <span className="chip bg-surface-2 text-[11px] text-gray-500">최근 {summary.sample}판 분석</span>
        </div>

        {/* 서술 분석 */}
        <div className="space-y-2">
          {summary.analysis.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-gray-300">
              {para}
            </p>
          ))}
        </div>

        {/* 지표 타일 */}
        {summary.items.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {summary.items.map((it) => (
              <div key={it.title} className="rounded-lg border border-line bg-surface-2 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                  <span>{it.icon}</span>
                  {it.title}
                </div>
                <div
                  className="mt-1 truncate text-lg font-black"
                  style={{ color: it.tone && it.tone !== "neutral" ? TONE[it.tone] : "rgb(var(--g50))" }}
                  title={it.value}
                >
                  {it.value}
                </div>
                {it.sub && <div className="mt-0.5 truncate text-[11px] text-gray-500">{it.sub}</div>}
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-[11px] text-gray-500">* 최근 전적 데이터를 자동 분석한 결과입니다.</p>
      </div>
    </section>
  );
}
