import { getCostumes, type Costume } from "@/lib/costumes";
import { getCharacters } from "@/lib/neople";
import CostumeGallery from "@/components/costumes/CostumeGallery";
import { EmptyState, ErrorState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "코스튬",
  description: "사이퍼즈 캐릭터별 코스튬(치장) 정보를 캐릭터·출시년도별로 모아 봅니다.",
};

/** 코스튬 정보 페이지 — 캐릭터별 그룹 + 연도/이름 필터. 데이터는 백엔드 costumes API 에서. */
export default async function CostumesPage() {
  let rows: Costume[] = [];
  let error: string | null = null;
  try {
    rows = await getCostumes();
  } catch (e) {
    error = (e as Error).message;
  }

  // 캐릭터명 → characterId (헤더 초상화용). 실패해도 초상화만 이니셜로 폴백.
  let nameToId: Record<string, string> = {};
  try {
    const chars = await getCharacters();
    for (const c of chars.rows ?? []) {
      if (c.characterName) nameToId[c.characterName] = c.characterId;
    }
  } catch {}

  const total = rows.length;
  const characterCount = new Set(rows.map((r) => r.characterName)).size;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface to-surface-2 p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-primary">
              COSTUME
            </span>
            {total > 0 && (
              <span className="text-[11px] text-gray-500">
                캐릭터 {characterCount} · 코스튬 {total}종
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-50 sm:text-3xl">코스튬</h1>
          <p className="mt-1.5 max-w-xl text-sm text-gray-500">
            캐릭터별 코스튬(치장)을 출시년도별로 모았습니다. 카드를 누르면 원본 비율로 크게 볼 수 있어요.
          </p>
        </div>
      </div>

      {error ? (
        <ErrorState
          message="코스튬 데이터를 불러오지 못했습니다."
          hint="백엔드 서버(:4000)가 실행 중인지, costumes 테이블이 생성됐는지 확인하세요."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="등록된 코스튬이 아직 없습니다"
          description="관리자 페이지의 ‘코스튬’ 탭에서 ZIP을 업로드하면 여기에 표시됩니다."
          icon="👗"
        />
      ) : (
        <CostumeGallery costumes={rows} nameToId={nameToId} />
      )}
    </div>
  );
}
