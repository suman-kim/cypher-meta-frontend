/**
 * 사업자 정보 페이지(/business-info).
 * 서비스 운영 사업자의 표시 사항(상호·대표자·사업자등록번호·연락처 등)을 한곳에 보여 준다.
 * 값은 lib/business.ts 의 BUSINESS 상수만 바꾸면 되고, 빈 문자열인 항목은 화면에 표시하지 않는다.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { BUSINESS } from "@/lib/business";
import { SITE_NAME } from "@/lib/constants";

export const metadata = {
  title: "사업자 정보",
  description: `${SITE_NAME} 운영 사업자 정보 — 상호, 대표자, 사업자등록번호, 회사 사이트, 이메일 안내.`,
  alternates: { canonical: "/business-info" },
};

/** 표시 행 — 값이 없는 항목은 목록에서 제외한다 */
interface InfoRow {
  label: string;
  value: ReactNode;
}

/**
 * BUSINESS 상수를 화면 표시 행으로 변환한다.
 * @returns 값이 채워진 항목만 담은 행 목록(이메일은 메일 링크로)
 */
function buildRows(): InfoRow[] {
  const rows: { label: string; raw: string; value?: ReactNode }[] = [
    { label: "상호", raw: BUSINESS.companyName },
    { label: "대표자", raw: BUSINESS.representative },
    { label: "사업자등록번호", raw: BUSINESS.registrationNumber },
    {
      label: "회사 사이트",
      raw: BUSINESS.website,
      value: (
        <a
          href={BUSINESS.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
        >
          {BUSINESS.website.replace(/^https?:\/\//, "")}
          <span className="text-[10px] opacity-70">↗</span>
        </a>
      ),
    },
    { label: "통신판매업 신고번호", raw: BUSINESS.mailOrderNumber },
    { label: "사업장 주소", raw: BUSINESS.address },
    { label: "전화번호", raw: BUSINESS.phone },
    {
      label: "이메일",
      raw: BUSINESS.email,
      value: (
        <a
          href={`mailto:${BUSINESS.email}`}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {BUSINESS.email}
        </a>
      ),
    },
    { label: "호스팅 서비스", raw: BUSINESS.hosting },
  ];
  return rows.filter((r) => r.raw.trim()).map((r) => ({ label: r.label, value: r.value ?? r.raw }));
}

export default function BusinessInfoPage() {
  const rows = buildRows();

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* 히어로 */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <span className="chip bg-primary/10 text-primary">BUSINESS INFO</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-50 sm:text-4xl">사업자 정보</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
            {SITE_NAME} 서비스를 운영하는 사업자의 정보를 안내합니다.
          </p>
        </div>
      </div>

      {/* 사업자 정보 표 */}
      <section className="card overflow-hidden">
        <dl className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:gap-6 sm:px-7">
              <dt className="shrink-0 text-xs font-semibold text-gray-500 sm:w-40 sm:text-sm">{r.label}</dt>
              <dd className="min-w-0 break-words text-[15px] text-gray-200">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 안내 */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-surface to-surface-2 px-6 py-5 text-center">
        <p className="text-sm leading-relaxed text-gray-500">
          본 사이트는 Neople·넥슨과 무관한 비공식 팬 사이트입니다. 서비스 이용 조건은{" "}
          <Link href="/terms" className="font-medium text-primary underline-offset-2 hover:underline">
            이용약관
          </Link>
          에서 확인할 수 있습니다.
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
