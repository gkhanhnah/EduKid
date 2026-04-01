export function AppShell({ sidebar, header, bottomNav, children, contentClassName = '' }) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <div className="hidden shrink-0 md:block">{sidebar}</div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {header ? (
          <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur">
            {header}
          </header>
        ) : null}

        <main className="min-h-0 flex-1">
          <div
            className={`min-h-full px-4 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-8 md:py-10 md:pb-10 ${contentClassName}`.trim()}
          >
            {children}
          </div>
        </main>
      </div>

      {bottomNav}
    </div>
  )
}
