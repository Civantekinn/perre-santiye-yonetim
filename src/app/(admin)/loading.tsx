export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-perre-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="kart h-28 animate-pulse bg-white/70" />
        ))}
      </div>
      <div className="kart h-80 animate-pulse bg-white/70" />
    </div>
  );
}
