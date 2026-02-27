//components/layout/Footer.js
export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[var(--background)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-600">
            © {new Date().getFullYear()} QuoteSignal. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <a className="hover:text-slate-900" href="/privacy">
              Privacy
            </a>
            <a className="hover:text-slate-900" href="/terms">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
