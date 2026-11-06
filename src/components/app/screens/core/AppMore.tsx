/**
 * 앱 더보기 (시안 16) — 내 계정, 도구(멀티서치·비교·방송·커뮤니티), 정보(캐릭터·아이템·코스튬·업데이트), 설정, 안내.
 *
 * 알림 설정은 푸시 알림을 붙이기 전까지 "준비 중"으로 보인다(시안의 첫 출시 버전 프레임).
 * 켜고 끌 수 있는 것처럼 보이면서 실제로 오지 않는 알림을 만들지 않기 위해서다.
 */
import Link from "next/link";
import { AppTopBar } from "../../AppChrome";
import { Icon, type IconName } from "../../icons";
import { AppPage, Badge, ListRow } from "../../ui";
import { MoreProfileCard, ThemeSetting } from "./MoreClient";

/** 더보기가 받는 값 */
export interface AppMoreProps {
  /** 지금 방송 중인 수 */
  liveCount: number;
  /** 최신 업데이트 한 줄 (버전 + 제목) */
  latestUpdate: string | null;
}

/** 작은 도구 카드 */
function ToolCard({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: IconName }) {
  return (
    <Link href={href} className="a-card a-press grid content-start gap-1.5 p-3.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-app-ac-soft text-app-ac-tx">
        <Icon name={icon} size={17} />
      </span>
      <span className="text-sm font-bold text-gray-100">{title}</span>
      <span className="text-[11px] leading-snug text-gray-500">{desc}</span>
    </Link>
  );
}

/**
 * @param props AppMoreProps
 */
export default function AppMore({ liveCount, latestUpdate }: AppMoreProps) {
  return (
    <>
      <AppTopBar variant="large" title="더보기" />
      <AppPage>
        <MoreProfileCard />

        <div className="grid grid-cols-2 gap-2.5">
          <ToolCard href="/players/multi" title="멀티서치" desc="내 팀 · 상대 팀 최근 전적을 한 화면에" icon="users" />
          <ToolCard href="/players/compare" title="플레이어 비교" desc="두 플레이어의 함께한 경기 · 상대 전적" icon="swap" />
          <ToolCard
            href="/videos"
            title="방송 · 동영상"
            desc={liveCount > 0 ? `지금 방송 중 ${liveCount}` : "사이퍼즈 방송과 동영상"}
            icon="video"
          />
          <ToolCard href="/community" title="커뮤니티" desc="공식전 · 일반전 게시판" icon="community" />
        </div>

        <section className="grid gap-2">
          <h2 className="px-1 text-[13px] font-bold text-gray-500">정보</h2>
          <div className="a-card grid divide-y divide-line overflow-hidden">
            <ListRow href="/characters" title="캐릭터" desc="공식 역할군 · 스킬 · 추천 빌드" />
            <ListRow href="/items" title="아이템" desc="부위별 아이템 · 능력치" />
            <ListRow href="/costumes" title="코스튬" desc="캐릭터별 코스튬 · 출시 연도별" />
            <ListRow href="/updates" title="업데이트" desc={latestUpdate ?? "Cyphers Meta 새 기능 소식"} />
          </div>
        </section>

        <section className="grid gap-2">
          <h2 className="px-1 text-[13px] font-bold text-gray-500">설정</h2>
          <div className="a-card grid gap-4 p-4">
            <ThemeSetting />
            <div className="grid gap-3 border-t border-line pt-4">
              {[
                ["전적 갱신 알림", "내 계정 · 즐겨찾기 플레이어에게 새 매치가 쌓이면 알려 드려요"],
                ["방송 시작 알림", "알림을 켠 스트리머가 방송을 시작하면 알려 드려요"],
              ].map(([t, d]) => (
                <div key={t} className="flex items-center gap-3">
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="text-sm font-bold text-gray-100">{t}</span>
                    <span className="text-[11px] leading-snug text-gray-500">{d}</span>
                  </span>
                  <Badge tone="mute">준비 중</Badge>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="grid justify-items-center gap-2 pt-1 text-center">
          <p className="text-[11px] leading-relaxed text-gray-500">
            Cyphers Meta · 비공식 팬 앱 · 데이터 제공 Neople 오픈 API
            <br />본 앱은 Neople · 넥슨과 무관합니다.
          </p>
          <p className="flex gap-3 text-[11px] font-semibold text-gray-400">
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/business-info">사업자 정보</Link>
          </p>
        </footer>
      </AppPage>
    </>
  );
}
