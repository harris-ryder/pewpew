import { useRef, useEffect, useCallback, useState } from 'react'
import { useGunStore } from '../store/gunStore'
import { useSerial } from '../hooks/useSerial'
import { canvasXToSteps, canvasYToSteps } from '../utils/math'
import { Stitching } from './Stitching'

const GRID_DIVS = 9
const ML = 30   // left margin — Y-axis labels
const MT = 10   // top margin — room for top Y-axis label
const MB = 14   // bottom margin — X-axis labels

export function TargetGrid() {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { target, hits, canvasSettings, connected, addHit, clearHits, setTarget, setCommandedTarget, updateCanvasSettings, theme } = useGunStore()
  const { send } = useSerial()

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
      bg:           isDark ? '#1c1c1c' : '#f2f2f2',
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

    ctx.fillStyle = col.bg
    ctx.fillRect(0, 0, W, H)

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

    // Target crosshair
    if (target) {
      const px = toX(target.x)
      const py = toY(target.y)

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
      ctx.font = '9px "Geist Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillText(`${Math.round(target.x)}, ${Math.round(target.y)}`, px + 8, py - 8)
    }

    // Border around data area only
    ctx.strokeStyle = col.border; ctx.lineWidth = 1
    ctx.strokeRect(ML + 0.5, MT + 0.5, dW - 1, dH - 1)
    ctx.restore()
  }, [target, hits, canvasSettings, theme])

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
    send(`AIM:${target.x},${target.y}`)
    setCommandedTarget(target)
  }
  const aimFire = () => {
    if (!target) return
    send(`AIM_FIRE:${target.x},${target.y}`)
    setCommandedTarget(target)
    addHit(target.x, target.y)
  }

  const inputCls = 'w-14 bg-transparent border border-border-default rounded-full px-1.5 py-0.5 text-caption font-mono text-text-primary text-center focus:outline-none focus:border-border-darker transition-colors'

  return (
    <div className="rounded-[24px] hatch-bg p-3 flex flex-col">
      {/* Settings */}
      <div className="relative z-10 bg-surface-primary rounded-2xl p-4 shrink-0 mb-[-1px] ring-1 ring-black">
        <div className="flex items-center justify-between mb-4">
          <span className="text-caption text-text-tertiary tracking-widest uppercase">Target Grid</span>
          <span className="text-caption text-text-tertiary">{hits.length} hits</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-caption text-text-tertiary">W</span>
            <input className={inputCls} type="number" value={wInput} onChange={e => setWInput(e.target.value)} onBlur={commitW} onKeyDown={onKey(commitW)} min={100} />
            <span className="text-caption text-text-tertiary">×</span>
            <span className="text-caption text-text-tertiary">H</span>
            <input className={inputCls} type="number" value={hInput} onChange={e => setHInput(e.target.value)} onBlur={commitH} onKeyDown={onKey(commitH)} min={100} />
            <span className="text-caption text-text-tertiary">mm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-caption text-text-tertiary">D</span>
            <input className={inputCls} type="number" value={dInput} onChange={e => setDInput(e.target.value)} onBlur={commitD} onKeyDown={onKey(commitD)} min={100} />
            <span className="text-caption text-text-tertiary">mm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-caption text-text-tertiary">Z</span>
            <input className={inputCls} type="number" value={zInput} onChange={e => setZInput(e.target.value)} onBlur={commitZ} onKeyDown={onKey(commitZ)} min={0} />
            <span className="text-caption text-text-tertiary">mm</span>
          </div>
        </div>
      </div>

      <Stitching />

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative z-10 bg-surface-primary rounded-2xl mb-[-1px] flex items-center justify-center p-3 w-full ring-1 ring-black"
        style={{ aspectRatio: `${canvasSettings.widthMm} / ${canvasSettings.heightMm}` }}
      >
        <canvas ref={canvasRef} onClick={handleClick} style={{ cursor: 'crosshair' }} />
      </div>

      <Stitching />

      {/* Controls */}
      <div className="relative z-10 bg-surface-primary rounded-2xl p-4 shrink-0 ring-1 ring-black">
        <div className="text-caption font-mono text-text-tertiary mb-4">
          {target ? (
            <>
              <span className="text-text-primary">{target.x}, {target.y} mm</span>
              {' — '}
              X={canvasXToSteps(target.x, canvasSettings.widthMm, canvasSettings.distanceMm)} Y={canvasYToSteps(target.y, canvasSettings.distanceMm)} steps
            </>
          ) : (
            'click grid to aim'
          )}
        </div>
        <div className="flex gap-1.5">
          <button
            className="flex-1 px-2 py-1.5 rounded-full text-caption font-medium border border-border-default text-text-secondary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            disabled={!connected || !target}
            onClick={aim}
          >
            Aim
          </button>
          <button
            className="flex-1 px-2 py-1.5 rounded-full text-caption font-medium bg-text-primary text-surface-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
            disabled={!connected || !target}
            onClick={aimFire}
          >
            Aim + Fire
          </button>
          <button
            className="px-2 py-1.5 rounded-full text-caption font-medium text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer"
            onClick={clearHits}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
