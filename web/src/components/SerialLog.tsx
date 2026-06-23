import { useRef, useEffect, useState } from 'react'
import { useGunStore } from '../store/gunStore'

export function SerialLog() {
  const [open, setOpen] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)
  const { serialLog, clearLog } = useGunStore()

  useEffect(() => {
    if (open && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [serialLog, open])

  const last = serialLog[serialLog.length - 1] ?? '—'

  return (
    <div className="shrink-0">
      <div
        className="h-8 flex items-center gap-2 px-3 cursor-pointer hover:bg-surface-tertiary/30 transition-colors select-none"
        onClick={() => setOpen(!open)}
      >
        <span className="text-caption text-text-tertiary uppercase tracking-widest shrink-0">Serial</span>
        <span className="flex-1 text-caption font-mono text-text-tertiary truncate">{last}</span>
        <span className="text-caption text-text-tertiary shrink-0">{open ? '▼' : '▲'}</span>
      </div>

      {open && (
        <div className="flex flex-col">
          <div ref={logRef} className="h-32 overflow-y-auto px-3 py-2 flex flex-col gap-px">
            {serialLog.length === 0 ? (
              <span className="text-caption text-text-tertiary">No messages yet.</span>
            ) : (
              serialLog.map((line, i) => (
                <span
                  key={i}
                  className={`text-caption font-mono leading-5 ${
                    line.startsWith('←') ? 'text-brand-green' :
                    line.startsWith('→') ? 'text-neutral-400' :
                    'text-text-tertiary'
                  }`}
                >
                  {line}
                </span>
              ))
            )}
          </div>
          <div className="flex justify-end px-3 py-1.5">
            <button
              className="text-caption text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
              onClick={clearLog}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
