'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from './ui/Button'
import { useTheme } from '../hooks/use-theme'

export interface ThemeToggleProps {
  showLabel?: boolean
  variant?: 'icon' | 'dropdown'
}

export function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-5 w-5" aria-hidden="true" />
    }
    return resolvedTheme === 'dark' ? (
      <Moon className="h-5 w-5" aria-hidden="true" />
    ) : (
      <Sun className="h-5 w-5" aria-hidden="true" />
    )
  }

  const getLabel = () => {
    if (theme === 'system') return 'System'
    return theme === 'dark' ? 'Dark' : 'Light'
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={cycleTheme}
      aria-label={`Switch theme (current: ${getLabel()})`}
      className="gap-2"
    >
      {getIcon()}
      {showLabel && <span className="text-sm">{getLabel()}</span>}
    </Button>
  )
}
