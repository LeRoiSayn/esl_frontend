import { createContext, useContext, useState, useEffect, useMemo } from 'react'

const ThemeContext = createContext(null)

const THEME_MODE_KEY = 'theme_mode'

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  // themeMode: 'auto' | 'dark' | 'light'
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem(THEME_MODE_KEY) || 'auto'
  })

  // Resolve to boolean, also listen to system preference changes for 'auto'
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isDark = useMemo(() => {
    if (themeMode === 'dark') return true
    if (themeMode === 'light') return false
    return systemDark
  }, [themeMode, systemDark])

  useEffect(() => {
    const root = window.document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    // Keep the old 'theme' key for backward compatibility
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const setThemeMode = (mode) => {
    setThemeModeState(mode)
    localStorage.setItem(THEME_MODE_KEY, mode)
  }

  const toggleTheme = () => {
    setThemeMode(isDark ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
