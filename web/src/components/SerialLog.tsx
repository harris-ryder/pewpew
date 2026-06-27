import { useRef, useEffect, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
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
        className="h-8 flex items-center gap-3 px-4 cursor-pointer hover:bg-surface-primary transition-colors select-none"
        onClick={() => setOpen(!open)}
      >
        <span className="text-caption tracking-[0.12em] uppercase opacity-50 shrink-0">Serial</span>
        <span className="flex-1 text-caption font-mono opacity-50 truncate">{last}</span>
        {open
          ? <ChevronDown size={12} className="opacity-50 shrink-0" />
          : <ChevronUp size={12} className="opacity-50 shrink-0" />
        }
      </div>

      {open && (
        <div className="flex flex-col border-t border-surface-primary">
          <div ref={logRef} className="h-32 overflow-y-auto px-4 py-2 flex flex-col gap-px">
            {serialLog.length === 0 ? (
              <span className="text-caption opacity-50">No messages yet.</span>
            ) : (
              serialLog.map((line, i) => (
                <span
                  key={i}
                  className={`text-caption font-mono leading-5 ${
                    line.startsWith('←') ? 'text-text-secondary' :
                    line.startsWith('→') ? 'opacity-50' :
                    'opacity-30'
                  }`}
                >
                  {line}
                </span>
              ))
            )}
          </div>
          <div className="flex justify-end px-4 py-1.5 border-t border-surface-primary">
            <button
              className="text-caption opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
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
