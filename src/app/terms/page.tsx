import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/constants";

export const metadata = {
  title: "이용약관",
  description: `${SITE_NAME} 서비스 이용약관 — 서비스 이용 조건, 수집 정보, 데이터 출처 및 면책 안내.`,
  alternates: { canonical: "/terms" },
};

/** 시행일 · 외부 약관 링크 (이 두 값만 바꾸면 됩니다) */
const EFFECTIVE_DATE = "2026년 7월 23일";
const NEOPLE_TERMS_URL = "https://developers.neople.co.kr/";

interface Item {
  text?: string;
  node?: ReactNode;
  sub?: string[];
}
interface Article {
  code: string;
  num: string;
  title: string;
  items: Item[];
}

const ARTICLES: Article[] = [
  {
    code: "제1조",
    num: "01",
    title: "목적",
    items: [
      {
        text: `본 약관은 ${SITE_NAME}(이하 "서비스")가 제공하는 사이퍼즈 전적 검색 및 통계 기능의 이용과 관련하여, 서비스와 이용자 사이의 권리·의무 및 책임 사항을 정하는 것을 목적으로 합니다.`,
      },
    ],
  },
  {
    code: "제2조",
    num: "02",
    title: "서비스의 이용",
    items: [
      { text: "서비스는 회원가입이나 로그인 없이 누구나 무료로 이용할 수 있습니다." },
      {
        text: "서비스는 다음의 기능을 제공합니다.",
        sub: ["전적 검색 및 매치 상세", "랭킹 · 캐릭터 · 아이템 정보", "메타 통계 및 티어·조합 분석", "커뮤니티 게시판 및 이용자 투표"],
      },
      {
        text: "서비스는 운영상 또는 기술상의 필요에 따라 제공 기능의 전부 또는 일부를 사전 고지 없이 변경하거나 중단할 수 있습니다.",
      },
    ],
  },
  {
    code: "제3조",
    num: "03",
    title: "수집하는 정보와 이용 목적",
    items: [
      {
        text: "서비스는 원활한 운영과 품질 개선을 위해 이용 과정에서 다음 정보를 자동으로 수집할 수 있습니다.",
        sub: [
          "접속 IP 주소 및 대략적인 접속 지역",
          "브라우저 · 기기 정보(User-Agent)",
          "방문 경로 및 페이지 이용 기록",
          "투표 등 기능 이용 시 부여되는 익명 식별용 쿠키",
        ],
      },
      {
        text: "수집한 정보는 아래 목적에 한하여 이용합니다.",
        sub: ["서비스 안정화 및 이용 통계 분석", "기능 개선 및 신규 기능 개발", "부정 이용·중복 투표 방지 등 보안 유지"],
      },
      {
        text: "서비스는 이름·연락처 등 개인을 식별할 수 있는 정보를 별도로 요구하지 않으며, 수집한 정보를 본래 목적 외로 제3자에게 판매하지 않습니다.",
      },
    ],
  },
  {
    code: "제4조",
    num: "04",
    title: "이용자의 의무",
    items: [
      {
        text: "이용자는 다음 행위를 하여서는 안 됩니다.",
        sub: [
          "자동화된 수단으로 서비스에 과도한 부하를 유발하거나 데이터를 대량 수집하는 행위",
          "투표 결과를 조작하거나 시스템의 취약점을 악용하는 행위",
          "커뮤니티에 타인의 권리를 침해하거나 불법·유해한 내용을 게시하는 행위",
        ],
      },
      { text: "위 의무를 위반하여 발생한 문제에 대한 책임은 해당 이용자 본인에게 있습니다." },
    ],
  },
  {
    code: "제5조",
    num: "05",
    title: "커뮤니티 및 투표",
    items: [
      {
        text: "커뮤니티 게시물·댓글과 티어·조합 투표 결과는 이용자가 자유롭게 작성·참여한 것으로, 서비스의 공식 견해가 아닙니다.",
      },
      {
        text: "투표 결과와 통계는 참고용 지표이며, 표본 수나 이용자 성향에 따라 실제 게임 내 평가와 다를 수 있습니다.",
      },
      { text: "서비스는 운영 정책에 어긋나는 게시물이나 비정상적인 투표를 사전 통지 없이 삭제·조정할 수 있습니다." },
    ],
  },
  {
    code: "제6조",
    num: "06",
    title: "데이터 출처 및 저작권",
    items: [
      { text: "서비스가 제공하는 사이퍼즈 관련 데이터는 네오플 오픈 API를 통해 수집·가공한 것입니다." },
      {
        text: "사이퍼즈 및 이에 관한 모든 지식재산권은 (주)네오플에 귀속되며, 서비스는 그에 대한 어떠한 권리도 주장하지 않습니다.",
      },
      { text: "서비스는 네오플·넥슨과 무관한 비공식 팬 사이트입니다." },
      {
        node: (
          <>
            네오플 오픈 API 이용약관 원문은{" "}
            <a
              href={NEOPLE_TERMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
            >
              여기
            </a>
            에서 확인할 수 있습니다.
          </>
        ),
      },
    ],
  },
  {
    code: "제7조",
    num: "07",
    title: "면책",
    items: [
      {
        text: "서비스가 제공하는 정보는 외부 API에 의존하므로, 원천 데이터의 지연·오류·중단으로 인한 부정확성에 대하여 서비스는 책임을 지지 않습니다.",
      },
      { text: "서비스는 무상으로 제공되며, 특정 목적에의 적합성이나 무중단 제공을 보장하지 않습니다." },
    ],
  },
  {
    code: "제8조",
    num: "08",
    title: "약관의 변경",
    items: [
      { text: "본 약관은 관련 법령이나 서비스 정책에 따라 개정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다." },
      { text: "변경된 약관은 공지에 명시된 시행일부터 효력이 발생합니다." },
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* 히어로 */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative">
          <span className="chip bg-primary/10 text-primary">SERVICE TERMS</span>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-50 sm:text-4xl">이용약관</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
            {SITE_NAME} 서비스 이용에 관한 조건과 데이터 처리 방침을 안내합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="chip border border-line bg-surface-2 text-gray-400">시행일 · {EFFECTIVE_DATE}</span>
            <span className="chip border border-line bg-surface-2 text-gray-400">총 {ARTICLES.length}개 조항</span>
          </div>
        </div>
      </div>

      {/* 조항 카드 */}
      {ARTICLES.map((a) => (
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
                      {it.sub.map((t) => (
                        <li key={t} className="flex gap-2.5 text-[14px] leading-relaxed text-gray-400">
                          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                          <span>{t}</span>
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
          이 약관은 <span className="font-semibold text-gray-200">{EFFECTIVE_DATE}</span>부터 시행합니다.
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
