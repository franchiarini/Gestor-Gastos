import { useTheme } from '../theme/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      className="fixed right-3 top-3 z-50 flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm sm:right-5 sm:top-5"
      role="group"
      aria-label="Tema de la aplicación"
    >
      <button
        type="button"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
        className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${theme === 'light' ? 'bg-blue-600 text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'}`}
      >
        Claro
      </button>
      <button
        type="button"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
        className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${theme === 'dark' ? 'bg-blue-600 text-white' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'}`}
      >
        Oscuro
      </button>
    </div>
  )
}
