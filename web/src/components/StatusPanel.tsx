import { useGunStore } from '../store/gunStore'
import { xStepsToDeg, yStepsToDeg, stepsToCanvasX, stepsToCanvasY } from '../utils/math'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-caption opacity-50 uppercase">{label}</span>
      <span className="text-caption font-mono">{value}</span>
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
    <div className="p-4">
      <span className="text-caption tracking-[0.12em] uppercase opacity-50 block mb-2">Status</span>

      <div className="flex flex-col divide-y divide-surface-primary">
        <Row label="Pan X" value={`${posX > 0 ? '+' : ''}${posX} stp · ${xDeg}°`} />
        <Row label="Tilt Y" value={`${posY > 0 ? '+' : ''}${posY} stp · ${yDeg}°`} />
        <Row label="Trigger" value={`${posT} stp`} />
        <Row label="Aim X" value={`${aimX} mm`} />
        <Row label="Aim Y" value={`${aimY} mm`} />
        <Row label="Limit SW" value={limitSwitch ? 'Triggered' : 'Clear'} />
        <Row label="Serial" value={connected ? 'OK' : 'Offline'} />
      </div>
    </div>
  )
}
