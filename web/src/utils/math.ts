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
