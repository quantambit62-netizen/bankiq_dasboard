export default function LoadSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded animate-pulse" />
      ))}
    </div>
  );
}
