import { useState } from 'react'
import { useGunStore } from '../store/gunStore'
import { useSerial } from '../hooks/useSerial'

type Tab = 'y' | 'x' | 'trigger'

const JOG_SIZES = [1, 10, 50, 100] as const

const btnJog = 'flex-1 px-2 py-1.5 rounded-full text-caption font-medium border border-border-default text-text-secondary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer'
const btnGhost = 'flex-1 px-2 py-1.5 rounded-full text-caption font-medium border border-border-default text-text-secondary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer'

export function CalibrationPanel() {
  const [tab, setTab] = useState<Tab>('y')
  const [yJogSize, setYJogSize] = useState<number>(10)
  const [jogSize, setJogSize] = useState<number>(10)
  const [triggerJogSize, setTriggerJogSize] = useState<number>(5)

  const { calibration, posX, posY, posT, limitSwitch, connected, updateCalibration } = useGunStore()
  const { send } = useSerial()
  const dis = !connected

  return (
    <div className="bg-surface-primary rounded-2xl p-3 mb-[-1px]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption text-text-tertiary tracking-widest uppercase">Calibration</span>
        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${connected && calibration.yHomed && calibration.xCalibrated && calibration.triggerCalibrated ? 'bg-brand-green' : 'bg-neutral-300'}`} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(['y', 'x', 'trigger'] as Tab[]).map((t) => {
          const done = t === 'y' ? calibration.yHomed : t === 'x' ? calibration.xCalibrated : calibration.triggerCalibrated
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1 px-1 py-1 rounded-full text-caption font-medium transition-colors cursor-pointer ${
                tab === t
                  ? 'bg-surface-tertiary text-text-primary'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-tertiary/50'
              }`}
            >
              {t === 'y' ? 'Y' : t === 'x' ? 'X' : 'TRIG'}
              <span className={`w-1 h-1 rounded-full shrink-0 ${done && connected ? 'bg-brand-green' : 'bg-neutral-300'}`} />
            </button>
          )
        })}
      </div>

      {/* Y tab */}
      {tab === 'y' && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-text-tertiary leading-relaxed">
            Homes to limit switch, then applies saved offset to reach horizontal.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-tertiary uppercase">Limit SW</span>
            <span className={`text-caption px-1.5 py-0.5 rounded-full font-medium ${limitSwitch ? 'bg-brand-yellow/15 text-brand-yellow' : 'bg-surface-tertiary text-text-tertiary'}`}>
              {limitSwitch ? 'TRIGGERED' : 'CLEAR'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-tertiary uppercase">Position</span>
            <span className="text-caption font-mono text-text-primary">{posY} steps</span>
          </div>
          <button
            className="w-full px-3 py-1.5 rounded-full text-caption font-medium bg-brand-yellow text-neutral-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
            disabled={dis}
            onClick={() => send('HOME_Y')}
          >
            Home Y Axis
          </button>

          {calibration.yHomed && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-caption text-text-tertiary uppercase">Jog size</span>
                <div className="flex gap-1">
                  {JOG_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setYJogSize(s)}
                      className={`px-2 py-0.5 rounded-full text-caption font-medium transition-colors cursor-pointer ${
                        yJogSize === s ? 'bg-surface-tertiary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <button className={btnJog} disabled={dis} onClick={() => send(`JOG_Y:+${yJogSize}`)}>↓ Down</button>
                <button
                  className="px-3 py-1.5 rounded-full text-caption font-medium border border-border-darker text-text-primary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  disabled={dis}
                  onClick={() => send('STOP')}
                >
                  STOP
                </button>
                <button className={btnJog} disabled={dis} onClick={() => send(`JOG_Y:-${yJogSize}`)}>↑ Up</button>
              </div>
              <button
                className="w-full px-3 py-1.5 rounded-full text-caption font-medium border border-border-default text-text-secondary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                disabled={dis}
                onClick={() => send('SET_YHOME')}
              >
                Set Y Zero
              </button>
            </>
          )}
        </div>
      )}

      {/* X tab */}
      {tab === 'x' && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-text-tertiary leading-relaxed">
            Jog to physical center, set zero. Then jog to each limit and save.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-tertiary uppercase">Position</span>
            <span className="text-caption font-mono text-text-primary">{posX} steps</span>
          </div>

          {calibration.xCalibrated && (
            <div className="flex items-center gap-2">
              <span className="text-caption font-mono text-text-tertiary">{calibration.xMin}</span>
              <div className="flex-1 h-px bg-border-default relative">
                <div
                  className="absolute top-1/2 w-1.5 h-1.5 rounded-full bg-text-primary -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${((posX - calibration.xMin) / (calibration.xMax - calibration.xMin)) * 100}%` }}
                />
              </div>
              <span className="text-caption font-mono text-text-tertiary">{calibration.xMax}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-caption text-text-tertiary uppercase">Jog size</span>
            <div className="flex gap-1">
              {JOG_SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setJogSize(s)}
                  className={`px-2 py-0.5 rounded-full text-caption font-medium transition-colors cursor-pointer ${
                    jogSize === s ? 'bg-surface-tertiary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1">
            <button className={btnJog} disabled={dis} onClick={() => send(`JOG_X:-${jogSize}`)}>← L</button>
            <button
              className="px-3 py-1.5 rounded-full text-caption font-medium border border-border-darker text-text-primary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              disabled={dis}
              onClick={() => send('STOP')}
            >
              STOP
            </button>
            <button className={btnJog} disabled={dis} onClick={() => send(`JOG_X:+${jogSize}`)}>R →</button>
          </div>

          <button
            className="w-full px-3 py-1.5 rounded-full text-caption font-medium border border-border-default text-text-secondary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            disabled={dis}
            onClick={() => { send('SET_XZERO'); updateCalibration({ xCalibrated: false }) }}
          >
            Set X Zero
          </button>

          <div className="flex gap-1">
            <button className={btnGhost} disabled={dis} onClick={() => { send('SET_XMIN'); updateCalibration({ xMin: posX }) }}>
              ◄ Set Left Max
            </button>
            <button className={btnGhost} disabled={dis} onClick={() => { send('SET_XMAX'); updateCalibration({ xMax: posX, xCalibrated: true }) }}>
              Set Right Max ►
            </button>
          </div>
          <div className="flex justify-between text-caption font-mono text-text-tertiary">
            <span>Min: {calibration.xMin}</span>
            <span>Max: {calibration.xMax}</span>
          </div>
        </div>
      )}

      {/* Trigger tab */}
      {tab === 'trigger' && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-text-tertiary leading-relaxed">
            Trigger has <span className="text-text-secondary">no microswitch</span>. Jog to open position, save, then to fire position, save.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-caption text-text-tertiary uppercase">Position</span>
            <span className="text-caption font-mono text-text-primary">{posT} steps</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-caption text-text-tertiary uppercase">Jog size</span>
            <div className="flex gap-1">
              {[1, 5, 10, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => setTriggerJogSize(s)}
                  className={`px-2 py-0.5 rounded-full text-caption font-medium transition-colors cursor-pointer ${
                    triggerJogSize === s ? 'bg-surface-tertiary text-text-primary' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1">
            <button className={btnJog} disabled={dis} onClick={() => send(`JOG_T:-${triggerJogSize}`)}>← Pull</button>
            <button
              className="px-3 py-1.5 rounded-full text-caption font-medium border border-border-darker text-text-primary hover:bg-surface-tertiary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              disabled={dis}
              onClick={() => send('STOP')}
            >
              STOP
            </button>
            <button className={btnJog} disabled={dis} onClick={() => send(`JOG_T:+${triggerJogSize}`)}>Rel →</button>
          </div>

          <div className="flex gap-1">
            <button className={btnGhost} disabled={dis} onClick={() => { send('SET_TRIG_OPEN'); updateCalibration({ triggerOpen: posT }) }}>
              ◎ Set Open
            </button>
            <button className={btnGhost} disabled={dis} onClick={() => { send('SET_TRIG_CLOSE'); updateCalibration({ triggerClose: posT, triggerCalibrated: true }) }}>
              ● Set Fire
            </button>
          </div>
          <div className="flex justify-between text-caption font-mono text-text-tertiary">
            <span>Open: {calibration.triggerOpen}</span>
            <span>Fire: {calibration.triggerClose}</span>
          </div>

          <button
            className="w-full px-3 py-1.5 rounded-full text-caption font-medium bg-brand-yellow text-neutral-1000 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
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
