export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="hero-bg h-56 sm:h-72" />
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6">
        <div className="h-7 w-64 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
      </div>
    </div>
  );
}
