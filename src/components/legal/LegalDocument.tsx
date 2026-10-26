/**
 * 약관·방침 문서 공용 레이아웃 — 히어로(제목·시행일) + 조항 카드 목록 + 시행일 배너.
 * 이용약관(/terms)과 개인정보처리방침(/privacy)이 같은 모양을 쓰도록 조항 데이터만 받아 그린다.
 */
import Link from "next/link";
import type { ReactNode } from "react";

/** 조항 안의 항목 하나 — 본문(text 또는 node) + 선택적 하위 목록 */
export interface LegalItem {
  text?: string;
  node?: ReactNode;
  sub?: ReactNode[];
}

/** 조항 하나 */
export interface LegalArticle {
  /** 조 번호 표기(예: "제1조") */
  code: string;
  /** 카드 배지 번호(예: "01") */
  num: string;
  title: string;
  items: LegalItem[];
}

/**
 * 약관·방침 문서.
 * @param chip — 히어로 상단 영문 배지(예: "SERVICE TERMS")
 * @param title — 문서 제목
 * @param description — 히어로 설명 문장
 * @param effectiveDate — 시행일 표기(예: "2026년 10월 26일")
 * @param articles — 조항 목록
 * @param noun — 시행일 배너의 주어(예: "이 약관", "이 방침")
 */
export default function LegalDocument({
  chip,
  title,
  description,
  effectiveDate,
  articles,
  noun,
}: {
  chip: string;
  title: string;
  description: string;
  effectiveDate: string;
  articles: LegalArticle[];
  noun: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* 히어로 */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <span className="chip bg-primary/10 text-primary">{chip}</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-50 sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">{description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip border border-line bg-surface-2 text-gray-400">시행일 · {effectiveDate}</span>
            <span className="chip border border-line bg-surface-2 text-gray-400">총 {articles.length}개 조항</span>
          </div>
        </div>
      </div>

      {/* 조항 카드 */}
      {articles.map((a) => (
        <article key={a.code} className="card p-6 sm:p-7">
          <div className="flex items-center gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-base font-black text-primary">
              {a.num}
            </span>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">{a.code}</div>
              <h2 className="text-lg font-bold text-gray-100">{a.title}</h2>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {a.items.map((it, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface-2 text-[11px] font-bold text-gray-500">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 text-[15px] leading-relaxed text-gray-300">
                  {it.node ?? it.text}
                  {it.sub && (
                    <ul className="mt-3 space-y-2 rounded-lg border border-line bg-surface-2 p-4">
                      {it.sub.map((t, j) => (
                        <li key={j} className="flex gap-2.5 text-[14px] leading-relaxed text-gray-400">
                          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                          <span className="min-w-0">{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}

      {/* 시행일 배너 */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-surface to-surface-2 px-6 py-5 text-center">
        <p className="text-sm text-gray-500">
          {noun}은 <span className="font-semibold text-gray-200">{effectiveDate}</span>부터 시행합니다.
        </p>
      </div>

      <div className="pt-1 text-center">
        <Link href="/" className="text-sm text-gray-500 transition-colors hover:text-gray-300">
          ← 홈으로
        </Link>
      </div>
    </div>
  );
}

/**
 * 문서 안의 링크(새 탭 외부 링크 또는 내부 링크).
 * @param href — 이동할 주소(http 로 시작하면 새 탭)
 * @param children — 링크 텍스트
 */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  const cls = "font-medium text-primary underline underline-offset-2 hover:opacity-80";
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${cls} break-all`}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
