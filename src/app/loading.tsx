export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-bg-border border-t-brand" />
        <p className="text-sm text-gray-500">불러오는 중…</p>
      </div>
    </div>
  );
}
