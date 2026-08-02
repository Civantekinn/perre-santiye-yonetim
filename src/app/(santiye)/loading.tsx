export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-52 animate-pulse rounded-xl bg-perre-100" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kart h-24 animate-pulse bg-white/70" />
        ))}
      </div>
      <div className="kart h-72 animate-pulse bg-white/70" />
    </div>
  );
}
