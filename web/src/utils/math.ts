export const DEGREE_TO_STEPS = 17.78
export const DEFAULT_CANVAS_WIDTH = 1800
export const DEFAULT_CANVAS_HEIGHT = 1800
export const DEFAULT_GUN_OFFSET = 2300

/**
 * Convert canvas X coordinate (mm) to X-motor step count.
 * X=0 is left edge, X=canvasWidth is right edge.
 * When x = canvasWidth/2 (center), steps = 0.
 */
export function canvasXToSteps(
  x: number,
  canvasWidth: number = DEFAULT_CANVAS_WIDTH,
  gunOffset: number = DEFAULT_GUN_OFFSET
): number {
  const halfW = canvasWidth / 2
  const angle = Math.atan2(halfW - x, gunOffset) * (180 / Math.PI)
  return Math.round(angle * DEGREE_TO_STEPS)
}

/**
 * Convert canvas Y coordinate (mm) to Y-motor step count.
 * Y=0 is bottom edge. Negative steps = gun tilts up.
 */
export function canvasYToSteps(
  y: number,
  gunOffset: number = DEFAULT_GUN_OFFSET
): number {
  const angle = Math.atan2(y, gunOffset) * (180 / Math.PI)
  return -Math.round(angle * DEGREE_TO_STEPS)
}

/**
 * Convert X-motor steps back to canvas X coordinate (mm).
 */
export function stepsToCanvasX(
  steps: number,
  canvasWidth: number = DEFAULT_CANVAS_WIDTH,
  gunOffset: number = DEFAULT_GUN_OFFSET
): number {
  const angleDeg = steps / DEGREE_TO_STEPS
  const halfW = canvasWidth / 2
  return halfW - Math.tan(angleDeg * (Math.PI / 180)) * gunOffset
}

/**
 * Convert Y-motor steps back to canvas Y coordinate (mm).
 */
export function stepsToCanvasY(
  steps: number,
  gunOffset: number = DEFAULT_GUN_OFFSET
): number {
  const angleDeg = -steps / DEGREE_TO_STEPS
  return Math.tan(angleDeg * (Math.PI / 180)) * gunOffset
}

/**
 * Get X-motor angle in degrees from steps.
 * Positive = panned left.
 */
export function xStepsToDeg(steps: number): number {
  return steps / DEGREE_TO_STEPS
}

/**
 * Get Y-motor elevation angle in degrees from steps.
 * Positive = gun tilted up above horizontal.
 */
export function yStepsToDeg(steps: number): number {
  return -steps / DEGREE_TO_STEPS
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

import type { CornerSteps } from '../types'

export function bilinearSteps(
  cx: number,
  cy: number,
  widthMm: number,
  heightMm: number,
  corners: [CornerSteps, CornerSteps, CornerSteps, CornerSteps]
): { sx: number; sy: number } {
  const u  = cx / widthMm
  const v  = cy / heightMm
  const [bl, br, tl, tr] = corners
  const sx = Math.round((1 - v) * ((1 - u) * bl.sx + u * br.sx) + v * ((1 - u) * tl.sx + u * tr.sx))
  const sy = Math.round((1 - v) * ((1 - u) * bl.sy + u * br.sy) + v * ((1 - u) * tl.sy + u * tr.sy))
  return { sx, sy }
}

/**
 * Invert bilinearSteps: given motor steps, find the canvas mm position.
 * Uses Newton–Raphson on the bilinear forward map (converges in ~5 iterations).
 */
export function bilinearStepsInverse(
  sx: number,
  sy: number,
  widthMm: number,
  heightMm: number,
  corners: [CornerSteps, CornerSteps, CornerSteps, CornerSteps]
): { cx: number; cy: number } {
  const [bl, br, tl, tr] = corners
  let u = 0.5, v = 0.5

  for (let i = 0; i < 32; i++) {
    const sxHat = (1 - v) * ((1 - u) * bl.sx + u * br.sx) + v * ((1 - u) * tl.sx + u * tr.sx)
    const syHat = (1 - v) * ((1 - u) * bl.sy + u * br.sy) + v * ((1 - u) * tl.sy + u * tr.sy)

    const dsx_du = (1 - v) * (br.sx - bl.sx) + v * (tr.sx - tl.sx)
    const dsx_dv = (1 - u) * (tl.sx - bl.sx) + u * (tr.sx - br.sx)
    const dsy_du = (1 - v) * (br.sy - bl.sy) + v * (tr.sy - tl.sy)
    const dsy_dv = (1 - u) * (tl.sy - bl.sy) + u * (tr.sy - br.sy)

    const det = dsx_du * dsy_dv - dsx_dv * dsy_du
    if (Math.abs(det) < 1e-10) break

    const du = (dsy_dv * (sx - sxHat) - dsx_dv * (sy - syHat)) / det
    const dv = (dsx_du * (sy - syHat) - dsy_du * (sx - sxHat)) / det

    u = Math.max(0, Math.min(1, u + du))
    v = Math.max(0, Math.min(1, v + dv))

    if (Math.abs(du) < 1e-7 && Math.abs(dv) < 1e-7) break
  }

  return { cx: u * widthMm, cy: v * heightMm }
}
