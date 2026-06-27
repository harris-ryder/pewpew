import { useGunStore } from '../store/gunStore'
import { useSerial, SERIAL_SUPPORTED } from '../hooks/useSerial'

export function ConnectionPanel() {
  const connected = useGunStore((s) => s.connected)
  const { connect, disconnect } = useSerial()

  return (
    <div className="p-4 border-b border-surface-primary">
      <div className="flex items-center justify-between mb-3">
        <span className="text-caption tracking-[0.12em] uppercase opacity-50">Connection</span>
        <span className={`text-caption ${connected ? 'text-text-primary' : 'opacity-50'}`}>
          {connected ? 'Online' : 'Offline'}
        </span>
      </div>

      {!SERIAL_SUPPORTED && (
        <p className="text-caption opacity-50 mb-3">
          Use Chrome or Edge for Web Serial.
        </p>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-caption opacity-50">USB Serial</span>
        <span className="text-caption opacity-50">9600 baud</span>
      </div>

      <button
        className={`w-full px-3 py-1.5 text-caption transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          connected
            ? 'border border-surface-primary text-text-secondary hover:bg-surface-primary'
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
