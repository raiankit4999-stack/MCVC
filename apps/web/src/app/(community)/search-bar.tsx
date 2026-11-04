import type { Category, City } from '@/lib/types';
import { Icon } from '@/components/icons';

/** City + category + free text search. A plain GET form so it works without JavaScript. */
export function SearchBar({ cities, categories, defaults = {} }: { cities: City[]; categories: Category[]; defaults?: Record<string, string | undefined> }) {
  return (
    <form action="/stores" className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 sm:flex-row">
      <label className="relative flex items-center sm:w-36">
        <Icon name="pin" className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
        <span className="sr-only">City</span>
        <select name="city" defaultValue={defaults.city ?? ''} className="h-11 w-full appearance-none rounded-xl border-0 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 focus:ring-2 focus:ring-brand">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="sm:w-44">
        <span className="sr-only">Category</span>
        <select name="category" defaultValue={defaults.category ?? ''} className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3 text-sm text-slate-800 focus:ring-2 focus:ring-brand">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="min-w-0 flex-1 sm:min-w-[180px]">
        <span className="sr-only">Search</span>
        <input name="q" defaultValue={defaults.q ?? ''} placeholder="Search stores, products or services…" className="h-11 w-full rounded-xl border-0 bg-slate-50 px-3 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-brand" />
      </label>
      <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-700">
        <Icon name="search" className="h-4 w-4" /> Search
      </button>
    </form>
  );
}
