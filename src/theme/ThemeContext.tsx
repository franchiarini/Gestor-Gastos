import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const THEME_STORAGE_KEY = 'gestor-gastos-theme'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getAppliedTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const isDark = theme === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getAppliedTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function setTheme(themeToApply: Theme) {
    applyTheme(themeToApply)
    setThemeState(themeToApply)

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeToApply)
    } catch {
      // El tema sigue aplicado durante esta sesión aunque no pueda persistirse.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme debe utilizarse dentro de ThemeProvider.')
  }

  return context
}
