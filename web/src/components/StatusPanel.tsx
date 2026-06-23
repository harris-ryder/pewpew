import { useGunStore } from '../store/gunStore'
import { xStepsToDeg, yStepsToDeg, stepsToCanvasX, stepsToCanvasY } from '../utils/math'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-[3px]">
      <span className="text-caption text-text-tertiary uppercase">{label}</span>
      <span className="text-caption font-mono text-text-primary">{value}</span>
    </div>
  )
}

export function StatusPanel() {
  const { posX, posY, posT, limitSwitch, connected, canvasSettings } = useGunStore()

  const xDeg = xStepsToDeg(posX).toFixed(1)
  const yDeg = yStepsToDeg(posY).toFixed(1)
  const aimX = stepsToCanvasX(posX, canvasSettings.widthMm, canvasSettings.distanceMm).toFixed(0)
  const aimY = stepsToCanvasY(posY, canvasSettings.distanceMm).toFixed(0)

  return (
    <div className="bg-surface-primary rounded-2xl p-3">
      <span className="text-caption text-text-tertiary tracking-widest uppercase block mb-3">Status</span>

      <div className="flex flex-col">
        <Row label="Pan X" value={`${posX > 0 ? '+' : ''}${posX} steps`} />
        <Row label="" value={`${xDeg}°`} />
        <Row label="Tilt Y" value={`${posY > 0 ? '+' : ''}${posY} steps`} />
        <Row label="" value={`${yDeg}°`} />
        <Row label="Trigger" value={`${posT} steps`} />
        <Row label="Aim X" value={`${aimX} mm`} />
        <Row label="Aim Y" value={`${aimY} mm`} />

        <div className="flex items-center justify-between py-[3px]">
          <span className="text-caption text-text-tertiary uppercase">Limit SW</span>
          <span className={`text-caption px-1.5 py-0.5 rounded-full font-medium ${limitSwitch ? 'bg-brand-yellow/15 text-brand-yellow' : 'bg-surface-tertiary text-text-tertiary'}`}>
            {limitSwitch ? 'TRIGGERED' : 'CLEAR'}
          </span>
        </div>

        <div className="flex items-center justify-between py-[3px]">
          <span className="text-caption text-text-tertiary uppercase">Serial</span>
          <span className={`text-caption px-1.5 py-0.5 rounded-full font-medium ${connected ? 'bg-surface-tertiary text-text-primary' : 'bg-surface-tertiary text-text-secondary'}`}>
            {connected ? 'OK' : 'OFFLINE'}
          </span>
        </div>
      </div>
    </div>
  )
}
