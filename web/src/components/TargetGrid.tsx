import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useGunStore } from '../store/gunStore'
import { useSerial } from '../hooks/useSerial'
import { canvasXToSteps, canvasYToSteps, bilinearSteps, bilinearStepsInverse, stepsToCanvasX, stepsToCanvasY } from '../utils/math'
import type { CornerSteps } from '../types'

const GRID_DIVS = 9
const ML = 30   // left margin — Y-axis labels
const MT = 10   // top margin — room for top Y-axis label
const MB = 14   // bottom margin — X-axis labels

export const runAPI = {
  start: (_mode: 'run' | 'dryrun') => {},
  stop: () => {},
  getMode: (): 'idle' | 'run' | 'dryrun' => 'idle',
}

export function TargetGrid() {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { posX, posY, target, hits, savedCoords, canvasSettings, calibration, connected, addHit, clearHits, saveCoord, deleteSavedCoord, setTarget, setCommandedTarget, updateCanvasSettings, theme } = useGunStore()
  const { send } = useSerial()

  const getSteps = (pt: typeof target) => {
    if (!pt) return null
    const { widthMm, heightMm, distanceMm, tableHeightMm } = canvasSettings
    if (calibration.canvasCalibrated) {
      return bilinearSteps(pt.x, pt.y, widthMm, heightMm,
        calibration.corners as [CornerSteps, CornerSteps, CornerSteps, CornerSteps])
    }
    return {
      sx: canvasXToSteps(pt.x, widthMm, distanceMm),
      sy: canvasYToSteps(pt.y, distanceMm),
    }
  }

  const [wInput, setWInput] = useState(String(canvasSettings.widthMm))
  const [hInput, setHInput] = useState(String(canvasSettings.heightMm))
  const [dInput, setDInput] = useState(String(canvasSettings.distanceMm))
  const [zInput, setZInput] = useState(String(canvasSettings.tableHeightMm))

  useEffect(() => { setWInput(String(canvasSettings.widthMm))         }, [canvasSettings.widthMm])
  useEffect(() => { setHInput(String(canvasSettings.heightMm))        }, [canvasSettings.heightMm])
  useEffect(() => { setDInput(String(canvasSettings.distanceMm))      }, [canvasSettings.distanceMm])
  useEffect(() => { setZInput(String(canvasSettings.tableHeightMm))   }, [canvasSettings.tableHeightMm])

  const commitW = () => {
    const v = Math.max(100, parseInt(wInput) || canvasSettings.widthMm)
    setWInput(String(v)); updateCanvasSettings({ widthMm: v })
  }
  const commitH = () => {
    const v = Math.max(100, parseInt(hInput) || canvasSettings.heightMm)
    setHInput(String(v)); updateCanvasSettings({ heightMm: v })
  }
  const commitD = () => {
    const v = Math.max(100, parseInt(dInput) || canvasSettings.distanceMm)
    setDInput(String(v)); updateCanvasSettings({ distanceMm: v }); send(`SET_OFFSET:${v}`)
  }
  const commitZ = () => {
    const v = Math.max(0, parseInt(zInput) || canvasSettings.tableHeightMm)
    setZInput(String(v)); updateCanvasSettings({ tableHeightMm: v })
  }

  const onKey = (commit: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { commit(); (e.target as HTMLElement).blur() }
  }

  const [runMode, setRunMode] = useState<'idle' | 'run' | 'dryrun'>('idle')
  const [runIndex, setRunIndex] = useState(0)
  const savedCoordsRef = useRef(savedCoords)
  savedCoordsRef.current = savedCoords
  const getStepsRef = useRef(getSteps)
  getStepsRef.current = getSteps

  const gunMm = useMemo(() => {
    const { widthMm, heightMm, distanceMm } = canvasSettings
    if (calibration.canvasCalibrated && calibration.corners.every(Boolean)) {
      return bilinearStepsInverse(posX, posY, widthMm, heightMm,
        calibration.corners as [CornerSteps, CornerSteps, CornerSteps, CornerSteps])
    }
    return { cx: stepsToCanvasX(posX, widthMm, distanceMm), cy: stepsToCanvasY(posY, distanceMm) }
  }, [posX, posY, canvasSettings, calibration])

  const stopRun = useCallback(() => {
    setRunMode('idle')
    setRunIndex(0)
  }, [])

  const startRun = useCallback((mode: 'run' | 'dryrun') => {
    if (savedCoords.length === 0 || !connected) return
    setRunMode(mode)
    setRunIndex(0)
  }, [savedCoords.length, connected])

  const runModeRef = useRef(runMode)
  runModeRef.current = runMode
  useEffect(() => {
    runAPI.start = (mode) => startRun(mode)
    runAPI.stop  = stopRun
    runAPI.getMode = () => runModeRef.current
  }, [startRun, stopRun])

  useEffect(() => {
    if (runMode === 'idle') return
    const coords = savedCoordsRef.current
    if (runIndex >= coords.length) { setRunMode('idle'); setRunIndex(0); return }
    const coord = coords[runIndex]
    const steps = getStepsRef.current({ x: coord.x, y: coord.y })
    if (steps) {
      if (runMode === 'run') {
        send(`AIM_FIRE_STEPS:${steps.sx},${steps.sy}`)
        addHit(coord.x, coord.y)
      } else {
        send(`AIM_STEPS:${steps.sx},${steps.sy}`)
      }
      setCommandedTarget({ x: coord.x, y: coord.y })
      setTarget({ x: coord.x, y: coord.y })
    }
    const t = setTimeout(() => setRunIndex(i => i + 1), 2000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runMode, runIndex])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    const { widthMm, heightMm } = canvasSettings
    ctx.save()
    ctx.scale(dpr, dpr)
    const isDark = theme === 'dark'

    const col = {
      gridMajor:    isDark ? '#292929' : '#c8c8c8',
      gridMinor:    isDark ? '#222222' : '#e3e3e3',
      label:        isDark ? '#484848' : '#929292',
      border:       isDark ? '#484848' : '#c8c8c8',
      hit:          isDark ? '#606060' : '#929292',
      crosshair:    isDark ? '#929292' : '#606060',
      crosshairDim: isDark ? '#92929250' : '#60606040',
    }

    // Data area sits inside margins: left=ML, top=MT, right=W, bottom=H-MB
    const dW = W - ML
    const dH = H - MT - MB

    // Map mm coords → data-area canvas coords
    const toX = (xMm: number) => ML + (xMm / widthMm)  * dW
    const toY = (yMm: number) => MT + (1 - yMm / heightMm) * dH

    ctx.clearRect(0, 0, W, H)

    // Grid lines (clipped to data area)
    ctx.save()
    ctx.beginPath(); ctx.rect(ML, MT, dW, dH); ctx.clip()
    for (let i = 0; i <= GRID_DIVS; i++) {
      const nx = ML + (i / GRID_DIVS) * dW
      const ny = MT +  (i / GRID_DIVS) * dH
      ctx.strokeStyle = i % 3 === 0 ? col.gridMajor : col.gridMinor
      ctx.lineWidth   = i % 3 === 0 ? 0.8 : 0.5
      ctx.beginPath(); ctx.moveTo(nx, MT);  ctx.lineTo(nx, MT + dH); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(ML, ny);  ctx.lineTo(W, ny);       ctx.stroke()
    }
    ctx.restore()

    // X-axis labels — below the data area
    ctx.fillStyle = col.label
    ctx.font = '9px "Geist Mono", monospace'
    ctx.textAlign = 'center'
    for (let i = 0; i <= GRID_DIVS; i++) {
      ctx.fillText(
        String(Math.round((i / GRID_DIVS) * widthMm)),
        ML + (i / GRID_DIVS) * dW,
        H - 3,
      )
    }

    // Y-axis labels — left of the data area
    ctx.textAlign = 'right'
    for (let i = 0; i <= GRID_DIVS; i++) {
      ctx.fillText(
        String(Math.round((i / GRID_DIVS) * heightMm)),
        ML - 4,
        MT + (1 - i / GRID_DIVS) * dH + 3,
      )
    }

    // Hits
    hits.forEach(hit => {
      const px = toX(hit.x)
      const py = toY(hit.y)
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fillStyle = col.hit + '99'; ctx.fill()
      ctx.strokeStyle = col.hit; ctx.lineWidth = 1; ctx.stroke()
    })

    // Saved coord path
    if (savedCoords.length > 0) {
      const dotCol  = isDark ? '#484848' : '#a0a0a0'
      const lineCol = isDark ? '#363636' : '#c0c0c0'
      if (savedCoords.length > 1) {
        ctx.beginPath()
        ctx.moveTo(toX(savedCoords[0].x), toY(savedCoords[0].y))
        for (let i = 1; i < savedCoords.length; i++) {
          ctx.lineTo(toX(savedCoords[i].x), toY(savedCoords[i].y))
        }
        ctx.strokeStyle = lineCol; ctx.lineWidth = 1
        ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([])
      }
      savedCoords.forEach((c, i) => {
        const px = toX(c.x); const py = toY(c.y)
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fillStyle = dotCol; ctx.fill()
        ctx.fillStyle = dotCol
        ctx.font = '8px "Geist Mono", monospace'; ctx.textAlign = 'left'
        ctx.fillText(String(i + 1), px + 5, py - 3)
      })
    }

    // Aim indicator — where the user clicked (lighter dashed ring)
    if (target) {
      const px = toX(target.x)
      const py = toY(target.y)
      ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2)
      ctx.setLineDash([3, 3])
      ctx.strokeStyle = col.crosshairDim; ctx.lineWidth = 1; ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = col.crosshairDim
      ctx.font = '9px "Geist Mono", monospace'; ctx.textAlign = 'left'
      ctx.fillText(`${Math.round(target.x)}, ${Math.round(target.y)}`, px + 14, py - 4)
    }

    // Gun position crosshair — tracks real posX/posY from Arduino
    {
      const gunXmm = gunMm.cx
      const gunYmm = gunMm.cy
      const px = toX(gunXmm)
      const py = toY(gunYmm)

      ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2)
      ctx.strokeStyle = col.crosshairDim; ctx.lineWidth = 1; ctx.stroke()

      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.strokeStyle = col.crosshair; ctx.lineWidth = 1.5; ctx.stroke()

      ctx.strokeStyle = col.crosshair; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(px - 20, py); ctx.lineTo(px - 7, py); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(px + 7,  py); ctx.lineTo(px + 20, py); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(px, py - 20); ctx.lineTo(px, py - 7); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(px, py + 7);  ctx.lineTo(px, py + 20); ctx.stroke()

      ctx.fillStyle = col.crosshair
      ctx.font = '9px "Geist Mono", monospace'; ctx.textAlign = 'left'
      ctx.fillText(`${Math.round(gunXmm)}, ${Math.round(gunYmm)}`, px + 8, py - 8)
    }

    // Border around data area only
    ctx.strokeStyle = col.border; ctx.lineWidth = 1
    ctx.strokeRect(ML + 0.5, MT + 0.5, dW - 1, dH - 1)
    ctx.restore()
  }, [posX, posY, target, hits, savedCoords, canvasSettings, theme])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const { width: cW, height: cH } = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const ratio = canvasSettings.widthMm / canvasSettings.heightMm

      // Fit the *data area* (inside margins + p-3 padding = 24px each axis) to the aspect ratio
      let dataW = cW - 24 - ML
      let dataH = dataW / ratio
      if (dataH > cH - 24 - MT - MB) {
        dataH = cH - 24 - MT - MB
        dataW = dataH * ratio
      }

      const cssW = dataW + ML
      const cssH = dataH + MT + MB

      canvas.width  = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
      canvas.style.width  = `${Math.round(cssW)}px`
      canvas.style.height = `${Math.round(cssH)}px`
      draw()
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [draw, canvasSettings.widthMm, canvasSettings.heightMm])

  useEffect(() => { draw() }, [draw])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dataW = rect.width  - ML
    const dataH = rect.height - MB
    const px = Math.max(0, Math.min(dataW, e.clientX - rect.left - ML))
    const py = Math.max(0, Math.min(dataH, e.clientY - rect.top))
    setTarget({
      x: Math.round((px / dataW) * canvasSettings.widthMm),
      y: Math.round((1 - py / dataH) * canvasSettings.heightMm),
    })
  }, [canvasSettings, setTarget])

  const aim = () => {
    if (!target) return
    const steps = getSteps(target)
    if (!steps) return
    send(`AIM_STEPS:${steps.sx},${steps.sy}`)
    setCommandedTarget(target)
  }

  const inputCls = 'w-14 bg-transparent border border-surface-primary px-1.5 py-0.5 text-caption font-mono text-text-primary text-center focus:outline-none transition-colors'

  return (
    <div className="flex flex-col h-full">
      {/* Settings */}
      <div className="p-4 border-b border-surface-primary shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-caption tracking-[0.12em] uppercase opacity-50">Target Grid</span>
          <span className="text-caption opacity-50">{hits.length} hits</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-caption opacity-50">W</span>
            <input className={inputCls} type="number" value={wInput} onChange={e => setWInput(e.target.value)} onBlur={commitW} onKeyDown={onKey(commitW)} min={100} />
            <span className="text-caption opacity-50">×</span>
            <span className="text-caption opacity-50">H</span>
            <input className={inputCls} type="number" value={hInput} onChange={e => setHInput(e.target.value)} onBlur={commitH} onKeyDown={onKey(commitH)} min={100} />
            <span className="text-caption opacity-50">mm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-caption opacity-50">D</span>
            <input className={inputCls} type="number" value={dInput} onChange={e => setDInput(e.target.value)} onBlur={commitD} onKeyDown={onKey(commitD)} min={100} />
            <span className="text-caption opacity-50">mm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-caption opacity-50">Z</span>
            <input className={inputCls} type="number" value={zInput} onChange={e => setZInput(e.target.value)} onBlur={commitZ} onKeyDown={onKey(commitZ)} min={0} />
            <span className="text-caption opacity-50">mm</span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-3 min-h-0 border-b border-surface-primary"
      >
        <canvas ref={canvasRef} onClick={handleClick} style={{ cursor: 'crosshair' }} />
      </div>

      {/* Controls */}
      <div className="p-4 shrink-0 border-b border-surface-primary">
        <div className="text-caption font-mono opacity-50 mb-3">
          {target ? (
            <>
              <span className="opacity-100 text-text-primary">{target.x}, {target.y} mm</span>
              {' — '}
              {(() => { const s = getSteps(target); return s ? `X=${s.sx} Y=${s.sy} stp` : '' })()}
            </>
          ) : (
            'Click grid to set target'
          )}
        </div>
        <div className="flex gap-1">
          <button
            className="flex-1 px-2 py-1.5 text-caption border border-surface-primary text-text-secondary hover:bg-surface-primary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer"
            disabled={!connected || !target}
            onClick={aim}
          >
            Aim
          </button>
          <button
            className="px-2 py-1.5 text-caption border border-surface-primary text-text-secondary hover:bg-surface-primary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer"
            disabled={!target}
            onClick={() => saveCoord(Math.round(gunMm.cx), Math.round(gunMm.cy))}
          >
            Save
          </button>
          <button
            className="px-2 py-1.5 text-caption border border-surface-primary text-text-secondary hover:bg-surface-primary transition-colors cursor-pointer"
            onClick={clearHits}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Saved coords — fixed height so canvas never resizes */}
      <div className="shrink-0 h-48 flex flex-col border-t border-surface-primary">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-surface-primary shrink-0">
          <span className="text-caption tracking-[0.12em] uppercase opacity-50 flex-1">Saved</span>
          {savedCoords.length > 0 && (runMode !== 'idle' ? (
            <button
              className="px-2 py-0.5 text-caption border border-surface-primary text-text-secondary hover:bg-surface-primary transition-colors cursor-pointer"
              onClick={stopRun}
            >
              Stop
            </button>
          ) : (
            <>
              <button
                className="px-2 py-0.5 text-caption border border-surface-primary text-text-secondary hover:bg-surface-primary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer"
                disabled={!connected}
                onClick={() => startRun('dryrun')}
              >
                Dry Run
              </button>
              <button
                className="px-2 py-0.5 text-caption bg-text-primary text-surface-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                disabled={!connected}
                onClick={() => startRun('run')}
              >
                Run
              </button>
            </>
          ))}
        </div>
        <div className="overflow-y-auto flex-1">
          {savedCoords.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-caption opacity-30">No saved coordinates</span>
            </div>
          ) : savedCoords.map((c, i) => (
            <div
              key={c.id}
              className={`flex items-center border-b border-surface-primary last:border-b-0 ${runMode !== 'idle' && i === runIndex ? 'bg-surface-primary' : ''}`}
            >
              <span className="pl-3 text-caption font-mono opacity-30 w-5 shrink-0">{i + 1}</span>
              <button
                className="flex-1 px-2 py-1.5 text-caption font-mono text-left hover:bg-surface-primary disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors cursor-pointer"
                disabled={!connected}
                onClick={() => setTarget({ x: c.x, y: c.y })}
              >
                {c.x}, {c.y} mm
              </button>
              <button
                className="px-3 py-1.5 text-caption opacity-30 hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => deleteSavedCoord(c.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
