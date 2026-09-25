import { createContext } from 'react'

export const ThemeContext = createContext({
  theme: 'light',
  resolvedTheme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
})
