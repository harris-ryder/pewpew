import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Calibration, CanvasSettings, Hit, TargetPoint } from '../types'

interface GunStore {
  // Serial connection
  connected: boolean
  serialLog: string[]

  // Live gun position (steps)
  posX: number
  posY: number
  posT: number
  limitSwitch: boolean

  // Target (canvas click → ghost gun)
  target: TargetPoint | null

  // Commanded target (aim/fire click → real gun)
  commandedTarget: TargetPoint | null

  // Hit history
  hits: Hit[]

  // Persisted: calibration
  calibration: Calibration

  // Persisted: canvas settings
  canvasSettings: CanvasSettings

  // Active calibration sub-mode
  calMode: 'none' | 'y-homing' | 'x-jogging' | 'trigger-jogging'

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // Actions
  setConnected: (v: boolean) => void
  setPosition: (x: number, y: number, t: number) => void
  setLimitSwitch: (v: boolean) => void
  setTarget: (t: TargetPoint | null) => void
  setCommandedTarget: (t: TargetPoint | null) => void
  addHit: (x: number, y: number) => void
  clearHits: () => void
  addLog: (msg: string) => void
  clearLog: () => void
  updateCalibration: (c: Partial<Calibration>) => void
  updateCanvasSettings: (s: Partial<CanvasSettings>) => void
  setCalMode: (m: GunStore['calMode']) => void
}

const DEFAULT_CANVAS = { widthMm: 1800, heightMm: 1800, distanceMm: 2300 }
const DEFAULT_CAL = { xMin: -5000, xMax: 5000, yHomed: false, xCalibrated: false, triggerOpen: 0, triggerClose: -700, triggerCalibrated: false }

function sanitizeNum(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function sanitizeCanvas(s: unknown): typeof DEFAULT_CANVAS {
  if (!s || typeof s !== 'object') return { ...DEFAULT_CANVAS }
  const o = s as Record<string, unknown>
  return {
    widthMm: sanitizeNum(o.widthMm, DEFAULT_CANVAS.widthMm),
    heightMm: sanitizeNum(o.heightMm, DEFAULT_CANVAS.heightMm),
    distanceMm: sanitizeNum(o.distanceMm, DEFAULT_CANVAS.distanceMm),
  }
}

function sanitizeCalibration(s: unknown): typeof DEFAULT_CAL {
  if (!s || typeof s !== 'object') return { ...DEFAULT_CAL }
  const o = s as Record<string, unknown>
  return {
    xMin: sanitizeNum(o.xMin, DEFAULT_CAL.xMin),
    xMax: sanitizeNum(o.xMax, DEFAULT_CAL.xMax),
    yHomed: !!o.yHomed,
    xCalibrated: !!o.xCalibrated,
    triggerOpen: sanitizeNum(o.triggerOpen, DEFAULT_CAL.triggerOpen),
    triggerClose: sanitizeNum(o.triggerClose, DEFAULT_CAL.triggerClose),
    triggerCalibrated: !!o.triggerCalibrated,
  }
}

export const useGunStore = create<GunStore>()(
  persist(
    (set) => ({
      connected: false,
      serialLog: [],
      posX: 0,
      posY: 0,
      posT: 0,
      limitSwitch: false,
      target: null,
      commandedTarget: null,
      hits: [],
      calMode: 'none',
      theme: 'dark',

      calibration: { ...DEFAULT_CAL },
      canvasSettings: { ...DEFAULT_CANVAS },

      setConnected: (v) => set({ connected: v }),

      setPosition: (x, y, t) => set({ posX: x, posY: y, posT: t }),

      setLimitSwitch: (v) => set({ limitSwitch: v }),

      setTarget: (t) => set({ target: t }),
      setCommandedTarget: (t) => set({ commandedTarget: t }),

      addHit: (x, y) =>
        set((s) => ({
          hits: [...s.hits, { id: `${Date.now()}-${Math.random()}`, x, y }],
        })),

      clearHits: () => set({ hits: [] }),

      addLog: (msg) =>
        set((s) => ({
          serialLog: [...s.serialLog.slice(-199), msg],
        })),

      clearLog: () => set({ serialLog: [] }),

      updateCalibration: (c) =>
        set((s) => ({ calibration: { ...s.calibration, ...c } })),

      updateCanvasSettings: (cs) =>
        set((s) => ({ canvasSettings: { ...s.canvasSettings, ...cs } })),

      setCalMode: (m) => set({ calMode: m }),

      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'paintball-turret',
      partialize: (s) => ({
        calibration: s.calibration,
        canvasSettings: s.canvasSettings,
        hits: s.hits,
        theme: s.theme,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<GunStore>),
        calibration: sanitizeCalibration((persisted as Partial<GunStore>)?.calibration),
        canvasSettings: sanitizeCanvas((persisted as Partial<GunStore>)?.canvasSettings),
      }),
    }
  )
)
