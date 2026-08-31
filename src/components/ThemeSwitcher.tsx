import { useRef, useState } from 'react'
import { Check, Palette } from 'lucide-react'
import { themeOptions, useTheme } from '../context/ThemeContext'
import AnchoredPopover from './AnchoredPopover'

interface ThemeSwitcherProps {
  align?: 'left' | 'right'
  showLabel?: boolean
}

const ThemeSwitcher = ({ align = 'right', showLabel = false }: ThemeSwitcherProps) => {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="relative">
      <button
        ref={rootRef}
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Выбрать тему"
        className="lumi-control inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition"
      >
        <Palette className="h-5 w-5" />
        {showLabel && <span className="hidden sm:inline">{theme.name}</span>}
      </button>

      <AnchoredPopover open={open} anchorRef={rootRef} onClose={() => setOpen(false)} width={320} align={align} ariaLabel="Выбор темы" className="overflow-y-auto p-2">
        <div role="menu">
          <div className="px-3 pb-2 pt-1">
            <p className="lumi-text text-sm font-semibold">Оформление офиса</p>
            <p className="lumi-muted mt-0.5 text-xs">Выбор сохраняется только на этом устройстве</p>
          </div>
          <div className="space-y-1">
            {themeOptions.map(option => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={theme.id === option.id}
                onClick={() => {
                  setTheme(option.id)
                  setOpen(false)
                }}
                className="lumi-theme-option flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition"
              >
                <span className="flex shrink-0 overflow-hidden rounded-full border border-black/10 shadow-sm">
                  {option.swatches.map(color => (
                    <span key={color} className="h-7 w-3" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="lumi-text block text-sm font-medium">{option.name}</span>
                  <span className="lumi-muted mt-0.5 block truncate text-xs">{option.description}</span>
                </span>
                {theme.id === option.id && <Check className="lumi-accent-text h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      </AnchoredPopover>
    </div>
  )
}

export default ThemeSwitcher
