import { ReactNode } from "react";
import BoardSidebar from "@/components/community/BoardSidebar";

export default function CommunityBoardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
      <div className="mb-4 lg:mb-0 lg:sticky lg:top-20 lg:self-start">
        <BoardSidebar />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
