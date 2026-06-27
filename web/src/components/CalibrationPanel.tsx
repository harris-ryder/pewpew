import { useState } from 'react'
import { useGunStore } from '../store/gunStore'
import { useSerial } from '../hooks/useSerial'
import type { CornerSteps } from '../types'

type Tab = 'canvas' | 'trigger'
const JOG_SIZES = [1, 10, 50, 100] as const

const CORNERS: { label: string; short: string }[] = [
  { label: 'Bottom-Left',  short: 'BL' },
  { label: 'Bottom-Right', short: 'BR' },
  { label: 'Top-Left',     short: 'TL' },
  { label: 'Top-Right',    short: 'TR' },
]

// SVG positions for each corner in the diagram [cx, cy]
const CORNER_POS: [number, number][] = [
  [8,  44],  // BL
  [72, 44],  // BR
  [8,  8],   // TL
  [72, 8],   // TR
]

const btn     = 'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-caption border border-surface-primary text-text-secondary hover:bg-surface-primary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer'
const btnStop = 'flex items-center justify-center px-3 py-1.5 text-caption border border-surface-primary text-text-primary hover:bg-surface-primary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer'

export function CalibrationPanel() {
  const [tab, setTab]           = useState<Tab>('canvas')
  const [jogSize, setJogSize]   = useState<number>(10)
  const [trigJogSize, setTrigJogSize] = useState<number>(5)

  const { calibration, posX, posY, posT, yHomed, connected, updateCalibration } = useGunStore()
  const { send } = useSerial()
  const dis = !connected

  // Derive which step we're on from saved corners (resume on reload)
  const savedCount = calibration.corners.filter(Boolean).length
  const [cornerStep, setCornerStep] = useState<number>(
    calibration.canvasCalibrated ? 4 : savedCount
  )

  const saveCorner = () => {
    const steps: CornerSteps = { sx: posX, sy: posY }
    const newCorners = [...calibration.corners] as typeof calibration.corners
    newCorners[cornerStep] = steps
    const next = cornerStep + 1
    const done = next === 4
    updateCalibration({ corners: newCorners, canvasCalibrated: done })
    setCornerStep(done ? 4 : next)
  }

  const recalibrate = () => {
    updateCalibration({ corners: [null, null, null, null], canvasCalibrated: false })
    setCornerStep(0)
  }

  const calDone = calibration.triggerCalibrated && calibration.canvasCalibrated

  return (
    <div className="p-4 border-b border-surface-primary">
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption tracking-[0.12em] uppercase opacity-50">Calibration</span>
        <span className={`text-caption opacity-50 ${calDone && connected ? 'opacity-100' : ''}`}>
          {calDone && connected ? 'Done' : 'Pending'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border border-surface-primary mb-3">
        {(['canvas', 'trigger'] as Tab[]).map((t, i) => {
          const done = t === 'canvas' ? calibration.canvasCalibrated : calibration.triggerCalibrated
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1 text-caption transition-colors cursor-pointer ${
                i > 0 ? 'border-l border-surface-primary' : ''
              } ${tab === t ? 'bg-surface-primary text-text-primary' : 'opacity-50 hover:opacity-80 hover:bg-surface-primary/50'}`}
            >
              {t === 'canvas' ? 'Canvas' : 'Trigger'}
              <span className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle ${done && connected ? 'bg-green-500' : 'bg-text-tertiary opacity-40'}`} />
            </button>
          )
        })}
      </div>

      {/* ── Canvas tab ──────────────────────────────────────────────────── */}
      {tab === 'canvas' && (
        <div className="flex flex-col gap-2.5">
          {cornerStep < 4 ? (
            <>
              {/* Corner diagram */}
              <div className="flex justify-center">
                <svg width="80" height="52" viewBox="0 0 80 52" className="text-text-primary">
                  <rect x="8" y="8" width="64" height="36" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                  {CORNERS.map((_, i) => {
                    const [cx, cy] = CORNER_POS[i]
                    const saved   = !!calibration.corners[i]
                    const current = i === cornerStep
                    return (
                      <circle
                        key={i}
                        cx={cx} cy={cy} r={4}
                        fill={saved ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        strokeOpacity={current ? 1 : saved ? 0.5 : 0.2}
                        strokeWidth={current ? 1.5 : 1}
                      />
                    )
                  })}
                </svg>
              </div>

              <p className="text-caption opacity-50">
                Step {cornerStep + 1} of 4 — aim laser at <span className="text-text-primary opacity-100">{CORNERS[cornerStep].label}</span> corner.
              </p>

              {/* Home Y */}
              <div className="flex items-center justify-between">
                <span className="text-caption opacity-50 uppercase">Y Homed</span>
                <span className="text-caption">{yHomed ? 'Yes' : 'No'}</span>
              </div>
              <button
                className="w-full px-3 py-1.5 text-caption border border-surface-primary text-text-secondary hover:bg-surface-primary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer"
                disabled={dis}
                onClick={() => send('HOME_Y')}
              >
                Home Y Axis
              </button>

              {/* Jog size */}
              <div className="flex items-center justify-between">
                <span className="text-caption opacity-50 uppercase">Jog size</span>
                <div className="flex">
                  {JOG_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setJogSize(s)}
                      className={`px-2 py-0.5 text-caption transition-colors cursor-pointer ${
                        jogSize === s ? 'bg-surface-primary text-text-primary' : 'opacity-50 hover:opacity-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Y jog */}
              <div className="flex gap-1">
                <button className={btn} disabled={dis} onClick={() => send(`JOG_Y:-${jogSize}`)}>↑ Up</button>
                <button className={btnStop} disabled={dis} onClick={() => send('STOP')}>×</button>
                <button className={btn} disabled={dis} onClick={() => send(`JOG_Y:+${jogSize}`)}>↓ Down</button>
              </div>

              {/* X jog */}
              <div className="flex gap-1">
                <button className={btn} disabled={dis} onClick={() => send(`JOG_X:+${jogSize}`)}>← L</button>
                <button className={btnStop} disabled={dis} onClick={() => send('STOP')}>×</button>
                <button className={btn} disabled={dis} onClick={() => send(`JOG_X:-${jogSize}`)}>R →</button>
              </div>

              <div className="flex items-center justify-between text-caption font-mono opacity-50">
                <span>X {posX}</span>
                <span>Y {posY}</span>
              </div>

              <button
                className="w-full px-3 py-1.5 text-caption bg-text-primary text-surface-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                disabled={dis}
                onClick={saveCorner}
              >
                Save {CORNERS[cornerStep].short} Corner
              </button>
            </>
          ) : (
            <>
              {/* Complete state */}
              <div className="flex justify-center">
                <svg width="80" height="52" viewBox="0 0 80 52" className="text-text-primary">
                  <rect x="8" y="8" width="64" height="36" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
                  {CORNERS.map((_, i) => {
                    const [cx, cy] = CORNER_POS[i]
                    return (
                      <circle key={i} cx={cx} cy={cy} r={4} fill="currentColor" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1" />
                    )
                  })}
                </svg>
              </div>
              <p className="text-caption opacity-50">Canvas calibrated. Re-home each session before use.</p>
              <button
                className="w-full px-3 py-1.5 text-caption border border-surface-primary text-text-secondary hover:bg-surface-primary transition-colors cursor-pointer"
                onClick={recalibrate}
              >
                Recalibrate
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Trigger tab ─────────────────────────────────────────────── */}
      {tab === 'trigger' && (
        <div className="flex flex-col gap-2.5">
          <p className="text-caption opacity-50">No microswitch. Jog to open, save, then to fire, save.</p>
          <div className="flex items-center justify-between">
            <span className="text-caption opacity-50 uppercase">Position</span>
            <span className="text-caption font-mono">{posT} steps</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-caption opacity-50 uppercase">Jog size</span>
            <div className="flex">
              {[1, 5, 10, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => setTrigJogSize(s)}
                  className={`px-2 py-0.5 text-caption transition-colors cursor-pointer ${
                    trigJogSize === s ? 'bg-surface-primary text-text-primary' : 'opacity-50 hover:opacity-100'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <button className={btn} disabled={dis} onClick={() => send(`JOG_T:-${trigJogSize}`)}>← Pull</button>
            <button className={btnStop} disabled={dis} onClick={() => send('STOP')}>×</button>
            <button className={btn} disabled={dis} onClick={() => send(`JOG_T:+${trigJogSize}`)}>Rel →</button>
          </div>
          <div className="flex gap-1">
            <button className={btn} disabled={dis} onClick={() => { send('SET_TRIG_OPEN'); updateCalibration({ triggerOpen: posT }) }}>Set Open</button>
            <button className={btn} disabled={dis} onClick={() => { send('SET_TRIG_CLOSE'); updateCalibration({ triggerClose: posT, triggerCalibrated: true }) }}>Set Fire</button>
          </div>
          <div className="flex justify-between text-caption font-mono opacity-50">
            <span>Open: {calibration.triggerOpen}</span>
            <span>Fire: {calibration.triggerClose}</span>
          </div>
          <button
            className="w-full px-3 py-1.5 text-caption bg-text-primary text-surface-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
            disabled={dis || !calibration.triggerCalibrated}
            onClick={() => send('FIRE')}
          >
            Test Fire
          </button>
        </div>
      )}
    </div>
  )
}
