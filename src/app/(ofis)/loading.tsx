export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-44 animate-pulse rounded-xl bg-perre-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="kart h-24 animate-pulse bg-white/70" />
        ))}
      </div>
      <div className="kart h-72 animate-pulse bg-white/70" />
    </div>
  );
}
