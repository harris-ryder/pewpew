import './index.css'
import { useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { ConnectionPanel } from './components/ConnectionPanel'
import { CalibrationPanel } from './components/CalibrationPanel'
import { StatusPanel } from './components/StatusPanel'
import { Stitching } from './components/Stitching'
import { GunVisualization } from './components/GunVisualization'
import { TargetGrid } from './components/TargetGrid'
import { SerialLog } from './components/SerialLog'
import { useGunStore } from './store/gunStore'
import { useSerial } from './hooks/useSerial'

export function App() {
  const connected = useGunStore((s) => s.connected)
  const theme = useGunStore((s) => s.theme)
  const toggleTheme = useGunStore((s) => s.toggleTheme)
  const { send } = useSerial()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="h-dvh relative overflow-hidden text-text-primary">
      {/* Canvas fills the full background */}
      <div className="absolute inset-0">
        <GunVisualization />
      </div>

      {/* UI overlay — pointer-events-none so the empty center passes clicks to the canvas */}
      <div className="relative h-full flex flex-col pointer-events-none">
        <header className="pointer-events-auto h-10 shrink-0 flex items-center gap-3 px-4 bg-surface-primary">
          <span className="text-small-body font-semibold tracking-widest text-text-primary">TURRET</span>
          <span className="text-caption text-text-tertiary">v1.0 · Web Serial · 9600 baud</span>
          <div className="flex-1" />
          <button
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer text-caption"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            className="px-3 py-1 rounded-full text-caption font-medium border border-border-darker text-text-primary hover:bg-surface-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            disabled={!connected}
            onClick={() => send('STOP')}
          >
            STOP
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0">
          <aside className="pointer-events-auto w-72 shrink-0 flex flex-col p-2 overflow-y-auto">
            <div className="flex flex-col rounded-[24px] bg-surface-on-primary p-3">
              <ConnectionPanel />
              <Stitching />
              <CalibrationPanel />
              <Stitching />
              <StatusPanel />
            </div>
          </aside>

          {/* Empty center — no pointer-events, so drag reaches the canvas */}
          <div className="flex-1" />

          <aside className="pointer-events-auto w-[500px] shrink-0 flex flex-col p-2 self-start">
            <TargetGrid />
          </aside>
        </div>

        <div className="pointer-events-auto shrink-0 bg-surface-primary">
          <SerialLog />
        </div>
      </div>
    </div>
  )
}
