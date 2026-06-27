import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Calibration, CanvasSettings, CornerSteps, Hit, TargetPoint } from '../types'

interface GunStore {
  connected: boolean
  serialLog: string[]

  posX: number
  posY: number
  posT: number
  limitSwitch: boolean

  // Session-only (not persisted)
  yHomed: boolean

  target: TargetPoint | null
  commandedTarget: TargetPoint | null
  hits: Hit[]
  savedCoords: Hit[]

  calibration: Calibration
  canvasSettings: CanvasSettings

  theme: 'dark' | 'light'
  toggleTheme: () => void

  setConnected: (v: boolean) => void
  setPosition: (x: number, y: number, t: number) => void
  setLimitSwitch: (v: boolean) => void
  setYHomed: (v: boolean) => void
  setTarget: (t: TargetPoint | null) => void
  setCommandedTarget: (t: TargetPoint | null) => void
  addHit: (x: number, y: number) => void
  clearHits: () => void
  saveCoord: (x: number, y: number) => void
  deleteSavedCoord: (id: string) => void
  addLog: (msg: string) => void
  clearLog: () => void
  updateCalibration: (c: Partial<Calibration>) => void
  updateCanvasSettings: (s: Partial<CanvasSettings>) => void
}

const DEFAULT_CANVAS: CanvasSettings = { widthMm: 1800, heightMm: 1800, distanceMm: 2300, tableHeightMm: 0 }
const DEFAULT_CAL: Calibration = {
  triggerOpen: 0,
  triggerClose: -700,
  triggerCalibrated: false,
  corners: [null, null, null, null],
  canvasCalibrated: false,
}

function sanitizeNum(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function sanitizeCorner(c: unknown): CornerSteps | null {
  if (!c || typeof c !== 'object') return null
  const o = c as Record<string, unknown>
  const sx = sanitizeNum(o.sx, 0)
  const sy = sanitizeNum(o.sy, 0)
  return { sx, sy }
}

function sanitizeCanvas(s: unknown): CanvasSettings {
  if (!s || typeof s !== 'object') return { ...DEFAULT_CANVAS }
  const o = s as Record<string, unknown>
  return {
    widthMm:       sanitizeNum(o.widthMm,       DEFAULT_CANVAS.widthMm),
    heightMm:      sanitizeNum(o.heightMm,      DEFAULT_CANVAS.heightMm),
    distanceMm:    sanitizeNum(o.distanceMm,    DEFAULT_CANVAS.distanceMm),
    tableHeightMm: sanitizeNum(o.tableHeightMm, DEFAULT_CANVAS.tableHeightMm),
  }
}

function sanitizeCalibration(s: unknown): Calibration {
  if (!s || typeof s !== 'object') return { ...DEFAULT_CAL }
  const o = s as Record<string, unknown>
  const rawCorners = Array.isArray(o.corners) ? o.corners : [null, null, null, null]
  const corners = [
    sanitizeCorner(rawCorners[0]),
    sanitizeCorner(rawCorners[1]),
    sanitizeCorner(rawCorners[2]),
    sanitizeCorner(rawCorners[3]),
  ] as Calibration['corners']
  return {
    triggerOpen:        sanitizeNum(o.triggerOpen,  DEFAULT_CAL.triggerOpen),
    triggerClose:       sanitizeNum(o.triggerClose, DEFAULT_CAL.triggerClose),
    triggerCalibrated:  !!o.triggerCalibrated,
    corners,
    canvasCalibrated:   !!o.canvasCalibrated && corners.every(Boolean),
  }
}

export const useGunStore = create<GunStore>()(
  persist(
    (set) => ({
      connected: false,
      serialLog: [],
      posX: 0, posY: 0, posT: 0,
      limitSwitch: false,
      yHomed: false,
      target: null,
      commandedTarget: null,
      hits: [],
      savedCoords: [],
      calibration: { ...DEFAULT_CAL },
      canvasSettings: { ...DEFAULT_CANVAS },
      theme: 'dark',

      setConnected:       (v)    => set({ connected: v }),
      setPosition:        (x, y, t) => set({ posX: x, posY: y, posT: t }),
      setLimitSwitch:     (v)    => set({ limitSwitch: v }),
      setYHomed:          (v)    => set({ yHomed: v }),
      setTarget:          (t)    => set({ target: t }),
      setCommandedTarget: (t)    => set({ commandedTarget: t }),
      addHit: (x, y) => set((s) => ({ hits: [...s.hits, { id: `${Date.now()}-${Math.random()}`, x, y }] })),
      clearHits:          ()     => set({ hits: [] }),
      saveCoord: (x, y) => set((s) => ({ savedCoords: [...s.savedCoords, { id: `${Date.now()}-${Math.random()}`, x, y }] })),
      deleteSavedCoord: (id) => set((s) => ({ savedCoords: s.savedCoords.filter(c => c.id !== id) })),
      addLog: (msg) => set((s) => ({ serialLog: [...s.serialLog.slice(-199), msg] })),
      clearLog:           ()     => set({ serialLog: [] }),
      updateCalibration:  (c)    => set((s) => ({ calibration: { ...s.calibration, ...c } })),
      updateCanvasSettings: (cs) => set((s) => ({ canvasSettings: { ...s.canvasSettings, ...cs } })),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'paintball-turret',
      partialize: (s) => ({
        calibration: s.calibration,
        canvasSettings: s.canvasSettings,
        hits: s.hits,
        savedCoords: s.savedCoords,
        theme: s.theme,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<GunStore>),
        calibration:    sanitizeCalibration((persisted as Partial<GunStore>)?.calibration),
        canvasSettings: sanitizeCanvas((persisted as Partial<GunStore>)?.canvasSettings),
      }),
    }
  )
)
