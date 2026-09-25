import { useEffect, useState } from 'react'
import { readStorage, writeStorage } from '../utils/storage'
import { ThemeContext } from './theme-context'

const THEME_STORAGE_KEY = 'careerflow_theme_mode'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = readStorage(THEME_STORAGE_KEY, null)
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved
    }
    // Default to system preference or light
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (theme === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    }
    return theme
  })

  useEffect(() => {
    function applyTheme(targetTheme) {
      let active = targetTheme
      if (targetTheme === 'system') {
        active = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      }

      setResolvedTheme(active)
      document.documentElement.setAttribute('data-theme', active)
      document.documentElement.classList.toggle('dark', active === 'dark')
      document.documentElement.classList.toggle('light', active === 'light')
    }

    applyTheme(theme)
    writeStorage(THEME_STORAGE_KEY, theme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = () => {
      if (theme === 'system') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        applyTheme(isSystemDark ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleSystemChange)
    return () => mediaQuery.removeEventListener('change', handleSystemChange)
  }, [theme])

  function toggleTheme() {
    setThemeState((prev) => {
      const current = prev === 'system' ? resolvedTheme : prev
      return current === 'dark' ? 'light' : 'dark'
    })
  }

  function setTheme(newMode) {
    if (['light', 'dark', 'system'].includes(newMode)) {
      setThemeState(newMode)
    }
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
