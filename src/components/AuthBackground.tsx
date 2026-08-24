import type { ReactNode } from 'react'

export function AuthBackground({ children }: { children: ReactNode }) {
  return (
    <main className="app-page relative isolate flex items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <img
          src="/dragon-theme.png"
          alt=""
          className="h-full w-full object-cover object-center opacity-25 saturate-75 sm:opacity-45 sm:saturate-100 dark:opacity-25 dark:brightness-50 dark:saturate-75"
        />
        <div className="absolute inset-0 bg-white/35 dark:bg-slate-950/45" />
      </div>
      <div className="relative z-10 flex w-full justify-center">
        {children}
      </div>
    </main>
  )
}
