import { useGunStore } from '../store/gunStore'
import { useSerial, SERIAL_SUPPORTED } from '../hooks/useSerial'

export function ConnectionPanel() {
  const connected = useGunStore((s) => s.connected)
  const { connect, disconnect } = useSerial()

  return (
    <div className="relative z-10 bg-surface-primary rounded-2xl p-4 mb-[-1px] ring-1 ring-black">
      <div className="flex items-center justify-between mb-4">
        <span className="text-caption text-text-tertiary tracking-widest uppercase">Connection</span>
        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${connected ? 'bg-brand-green' : 'bg-neutral-300'}`} />
      </div>

      {!SERIAL_SUPPORTED && (
        <p className="text-caption text-text-secondary mb-2">
          Web Serial not supported — use Chrome or Edge.
        </p>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className={`text-caption font-medium transition-colors ${connected ? 'text-text-primary' : 'text-text-tertiary'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
        <span className="text-caption text-text-tertiary">9600 baud</span>
      </div>

      <button
        className={`w-full px-3 py-1.5 rounded-full text-caption font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
          connected
            ? 'border border-border-default text-text-secondary hover:bg-surface-tertiary'
            : 'bg-text-primary text-surface-primary hover:opacity-90'
        }`}
        onClick={connected ? disconnect : connect}
        disabled={!SERIAL_SUPPORTED}
      >
        {connected ? 'Disconnect' : 'Connect to Arduino'}
      </button>
    </div>
  )
}
