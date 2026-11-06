/**
 * /android-beta — 안드로이드 앱 비공개 테스트 테스터 모집 공고.
 * 참여 3단계(그룹 가입 → 테스터 등록 → Play 스토어 설치), 앱으로 할 수 있는 것, 자주 묻는 질문을 한 화면에 모은다.
 * 접속 안내 모달·홈 배너·푸터에서 이 페이지로 온다. 앱 안에서 열면 홈으로 보낸다(이미 앱을 쓰는 중).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BetaSteps from "@/components/notices/BetaSteps";
import { ANDROID_BETA } from "@/lib/android-beta";
import { isAppRequest } from "@/lib/app-mode";

export const metadata: Metadata = {
  title: "안드로이드 앱 테스터 모집",
  description: "사이퍼즈 메타 안드로이드 앱 비공개 테스트에 참여해 주세요. 그룹 가입, 테스터 등록, Play 스토어 설치 3단계로 끝나요.",
  alternates: { canonical: ANDROID_BETA.pagePath },
};

/** 앱에서 할 수 있는 것 */
interface Feature {
  /** 제목 */
  title: string;
  /** 설명 */
  desc: string;
  /** 아이콘(SVG path d) */
  icon: string;
}

/** 앱에서 할 수 있는 것 목록 */
const FEATURES: Feature[] = [
  {
    title: "전적 갱신 알림",
    desc: "내 계정과 즐겨찾기한 플레이어의 새 경기가 반영되면 알려 드려요.",
    icon: "M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0",
  },
  {
    title: "방송 시작 알림",
    desc: "알림을 켠 치지직·유튜브 채널이 사이퍼즈 방송을 켜면 바로 알려 드려요.",
    icon: "M4 6h16v10H4zM9 20h6M12 16v4",
  },
  {
    title: "앱 전용 화면",
    desc: "전적 검색·캐릭터 티어·조합 메타·랭킹을 휴대폰에 맞춘 화면으로 빠르게 볼 수 있어요.",
    icon: "M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM11 18h2",
  },
];

/** 자주 묻는 질문 */
const FAQ: { q: string; a: string }[] = [
  {
    q: "아이폰에서도 쓸 수 있나요?",
    a: "지금은 안드로이드만 지원해요. 아이폰에서는 웹사이트를 그대로 이용해 주세요.",
  },
  {
    q: `왜 ${ANDROID_BETA.keepDays}일 동안 지우지 말아 달라고 하나요?`,
    a: `Google Play에 정식으로 출시하려면 테스터 12명 이상이 ${ANDROID_BETA.keepDays}일 동안 테스트를 이어 가야 해요. 설치해 두기만 해도 큰 도움이 돼요.`,
  },
  {
    q: "'테스터 되기' 화면이 안 나오거나 앱을 찾을 수 없다고 나와요.",
    a: "그룹에 가입한 Google 계정과 지금 로그인한 계정이 같은지 확인해 주세요. 그룹 가입이 반영되기까지 몇 분 걸릴 수 있으니 잠시 뒤 다시 열어 주세요.",
  },
  {
    q: "PC에서도 참여할 수 있나요?",
    a: "네. PC에서 1·2단계를 마치고, 휴대폰 Play 스토어에서 '사이퍼즈 메타'를 설치하면 돼요. 같은 Google 계정이어야 해요.",
  },
  {
    q: "테스트를 그만두고 싶어요.",
    a: "테스터 등록 페이지에서 '테스트 그만두기(Leave the program)'를 누르고 앱을 지우면 돼요. 그룹 탈퇴는 Google 그룹 페이지에서 할 수 있어요.",
  },
  {
    q: "앱이 모으는 정보가 궁금해요.",
    a: "웹사이트와 같은 방문 기록만 남기고, 알림은 앱에서 직접 켠 경우에만 받아요. 자세한 내용은 개인정보처리방침에 있어요.",
  },
];

/** 테스터 모집 공고 페이지 */
export default function AndroidBetaPage() {
  if (!ANDROID_BETA.enabled) notFound();
  if (isAppRequest()) redirect("/");

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* 히어로 */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface p-7 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#34a853]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.25rem] bg-gradient-to-br from-[#4f8dff] via-[#2f6fec] to-[#3d4fe0] text-white shadow-lg shadow-primary/30">
            {/* 앱 아이콘과 같은 막대 3개 */}
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="4" y="13" width="4" height="7" rx="1.6" />
              <rect x="10" y="9" width="4" height="11" rx="1.6" />
              <rect x="16" y="4" width="4" height="16" rx="1.6" />
            </svg>
          </span>
          <div className="min-w-0">
            <span className="chip bg-[#34a853]/10 text-[#34a853]">ANDROID BETA · 비공개 테스트</span>
            <h1 className="mt-2.5 text-2xl font-black tracking-tight text-gray-50 sm:text-3xl">사이퍼즈 메타 앱 테스터를 모집해요</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              정식 출시 전에 안드로이드 앱을 먼저 써 보고 의견을 들려주세요. 설치한 뒤{" "}
              <b className="text-gray-200">{ANDROID_BETA.keepDays}일 동안</b> 지우지 않고 두기만 해도 출시에 큰 도움이 돼요.
            </p>
            <a href="#steps" className="btn-primary mt-4">
              참여 방법 보기
              <span aria-hidden>↓</span>
            </a>
          </div>
        </div>
      </section>

      {/* 앱에서 할 수 있는 것 */}
      <section>
        <h2 className="mb-3 text-base font-bold text-gray-100">앱에서 먼저 써 볼 수 있어요</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={f.icon} />
                </svg>
              </span>
              <p className="mt-3 text-sm font-semibold text-gray-100">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 참여 방법 */}
      <section id="steps" className="card scroll-mt-24 p-5 sm:p-6">
        <h2 className="text-base font-bold text-gray-100">참여 방법 (3단계)</h2>
        <p className="mb-4 mt-1 text-sm text-gray-500">버튼을 누르면 새 탭으로 열려요. 순서대로 진행해 주세요.</p>
        <BetaSteps source="page" large />
      </section>

      {/* 자주 묻는 질문 */}
      <section className="card overflow-hidden">
        <h2 className="border-b border-line px-5 py-4 text-base font-bold text-gray-100 sm:px-6">자주 묻는 질문</h2>
        <div className="divide-y divide-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-200">
                {item.q}
                <span className="shrink-0 text-gray-500 transition-transform group-open:rotate-180" aria-hidden>
                  ▾
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 문의 */}
      <div className="rounded-2xl border border-line bg-gradient-to-br from-surface to-surface-2 px-6 py-5 text-center">
        <p className="text-sm leading-relaxed text-gray-500">
          테스트 중 불편한 점이나 의견은{" "}
          <a href={`mailto:${ANDROID_BETA.feedbackEmail}`} className="font-medium text-primary underline-offset-2 hover:underline">
            {ANDROID_BETA.feedbackEmail}
          </a>
          로 보내 주세요. 수집하는 정보는{" "}
          <Link href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">
            개인정보처리방침
          </Link>
          에서 확인할 수 있어요.
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
