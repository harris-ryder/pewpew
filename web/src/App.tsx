import './index.css'
import { useEffect, useRef, useState } from 'react'
import { ConnectionPanel } from './components/ConnectionPanel'
import { CalibrationPanel } from './components/CalibrationPanel'
import { StatusPanel } from './components/StatusPanel'
import { GunVisualization } from './components/GunVisualization'
import { TargetGrid } from './components/TargetGrid'
import { SerialLog } from './components/SerialLog'
import { useGunStore } from './store/gunStore'
import { useSerial } from './hooks/useSerial'
import { runAPI } from './components/TargetGrid'

const JOG_SIZES = [1, 10, 50, 100]

export function App() {
  const connected = useGunStore((s) => s.connected)
  const theme = useGunStore((s) => s.theme)
  const toggleTheme = useGunStore((s) => s.toggleTheme)
  const { send } = useSerial()

  const [jogStep, setJogStep] = useState(100)
  const [osd, setOsd] = useState<{ step: number; key: number } | null>(null)
  const osdKey = useRef(0)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault()
        setJogStep(prev => {
          const idx = JOG_SIZES.indexOf(prev)
          const next = e.key === 'ArrowUp'
            ? JOG_SIZES[Math.min(idx + 1, JOG_SIZES.length - 1)]
            : JOG_SIZES[Math.max(idx - 1, 0)]
          setOsd({ step: next, key: ++osdKey.current })
          return next
        })
        return
      }

      if (e.key === ' ') {
        e.preventDefault()
        if (runAPI.getMode() !== 'idle') { runAPI.stop(); return }
        if (connected) runAPI.start('run')
        return
      }

      if (!connected) return
      const arrowJog: Record<string, { cmd: string; dx: number; dy: number }> = {
        ArrowLeft:  { cmd: `JOG_X:+${jogStep}`, dx: +jogStep, dy: 0 },
        ArrowRight: { cmd: `JOG_X:-${jogStep}`, dx: -jogStep, dy: 0 },
        ArrowUp:    { cmd: `JOG_Y:-${jogStep}`, dx: 0, dy: -jogStep },
        ArrowDown:  { cmd: `JOG_Y:+${jogStep}`, dx: 0, dy: +jogStep },
      }
      const jog = arrowJog[e.key]
      if (jog) {
        e.preventDefault()
        send(jog.cmd)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [connected, send, jogStep])

  return (
    <div className="h-dvh relative overflow-hidden bg-surface-primary text-text-primary">
      {osd && (
        <div key={osd.key} className="jog-osd fixed inset-0 z-50 flex flex-col items-center justify-center gap-1">
          <span className="text-heading-1 text-text-primary">{osd.step}</span>
          <span className="text-caption opacity-50 tracking-[0.14em] uppercase">steps</span>
        </div>
      )}
      <div className="absolute inset-0">
        <GunVisualization />
      </div>

      <div className="relative h-full flex flex-col pointer-events-none">
        <header className="pointer-events-auto h-9 shrink-0 flex items-center gap-4 px-4 bg-surface-on-primary border-b border-surface-primary">
          <span className="text-caption font-medium tracking-[0.14em] uppercase">Turret</span>
          <span className="text-caption opacity-50">9600 baud</span>
          <div className="flex-1" />
          <button
            className="px-2 py-0.5 text-caption opacity-50 hover:opacity-100 border border-surface-primary hover:bg-surface-primary transition-all cursor-pointer"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button
            className="px-2 py-0.5 text-caption border border-surface-primary text-text-primary hover:bg-surface-primary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer"
            disabled={!connected}
            onClick={() => send('STOP')}
          >
            Stop
          </button>
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0">
          <aside className="pointer-events-auto w-64 shrink-0 flex flex-col overflow-y-auto bg-surface-on-primary border-r border-surface-primary">
            <ConnectionPanel />
            <CalibrationPanel />
            <StatusPanel />
          </aside>

          <div className="flex-1" />

          <aside className="pointer-events-auto w-[480px] shrink-0 flex flex-col overflow-hidden bg-surface-on-primary border-l border-surface-primary">
            <TargetGrid />
          </aside>
        </div>

        <div className="pointer-events-auto shrink-0 bg-surface-on-primary border-t border-surface-primary">
          <SerialLog />
        </div>
      </div>
    </div>
  )
}
