import LiveAccordion from "@/components/videos/LiveAccordion";
import VideoBrowser from "@/components/videos/VideoBrowser";
import { getLiveStreams } from "@/lib/live";
import { getVideosPage } from "@/lib/videos";

export const dynamic = "force-dynamic"; // Railway 내부망은 런타임 전용 — 빌드 프리렌더 대신 요청 시점 렌더

export const metadata = {
  title: "사이퍼즈 영상·방송",
  description:
    "치지직·유튜브의 사이퍼즈 라이브 방송과 인기 동영상을 조회순·최신순으로 한곳에서 확인하세요.",
  alternates: { canonical: "/videos" },
};

export default async function VideosPage() {
  const [live, page] = await Promise.all([getLiveStreams(20, 120), getVideosPage("view", 24, "", 0, 120)]);

  return (
    <div className="space-y-10">
      {/* 페이지 헤더 */}
      <section className="relative -mx-4 overflow-hidden border-b border-line px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 2xl:-mx-12 2xl:px-12">
        <div className="pointer-events-none absolute -top-24 left-1/3 h-56 w-[40rem] max-w-[90vw] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold tracking-wide text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            VIDEOS
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-gray-50 sm:text-[2rem]">동영상</h1>
          <p className="mt-1.5 max-w-lg text-sm text-gray-500">
            치지직·유튜브의 사이퍼즈 라이브와 인기 동영상을 한곳에서 모아보세요.
          </p>
        </div>
      </section>

      {/* 지금 방송 중 (아코디언 — 호버 시 확대) */}
      <LiveAccordion initial={live} limit={20} />

      {/* 사이퍼즈 동영상 (조회순/최신순, 무한 스크롤) */}
      <VideoBrowser
        initial={page.videos}
        initialSort="view"
        initialCursor={{ yt: page.nextYt === null ? "none" : page.nextYt, cz: page.nextCz }}
        initialHasMore={page.hasMore}
        pageSize={24}
      />
    </div>
  );
}
