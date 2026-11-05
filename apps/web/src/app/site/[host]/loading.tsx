export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-5 py-10" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
    </div>
  );
}
