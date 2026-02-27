//components/layout/Header.js
export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-[var(--background)]">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight text-slate-900">
            QuoteSignal
          </span>
        </a>

        <nav className="flex items-center gap-3">
          <a
            href="/intake"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Get Quotes
          </a>
        </nav>
      </div>
    </header>
  );
}
