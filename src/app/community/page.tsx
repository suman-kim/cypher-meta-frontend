export const metadata = { title: "커뮤니티" };

export default function CommunityPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-black text-gray-50">커뮤니티</h1>
        <span className="chip bg-surface-3 text-gray-500">준비중</span>
      </div>
      <div className="card p-12 text-center">
        <div className="text-4xl">💬</div>
        <p className="mt-3 font-semibold text-gray-200">커뮤니티 게시판은 준비 중입니다</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
          Neople 오픈API는 읽기 전용 게임 데이터만 제공하므로, 게시판·댓글은 별도 백엔드(DB)
          구축이 필요합니다. 디자인 레이아웃 자리만 먼저 잡아두었습니다.
        </p>
      </div>
    </div>
  );
}
