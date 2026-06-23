import { useCallback } from 'react'
import { useGunStore } from '../store/gunStore'

export const SERIAL_SUPPORTED = 'serial' in navigator

// Module-level singletons shared across all hook instances
let _port: SerialPort | null = null
let _writer: WritableStreamDefaultWriter<Uint8Array> | null = null
let _reader: ReadableStreamDefaultReader<Uint8Array> | null = null
let _reading = false

function st() {
  return useGunStore.getState()
}

function processLine(line: string) {
  const trimmed = line.trim()
  if (!trimmed) return
  st().addLog(`← ${trimmed}`)

  if (trimmed.startsWith('POS:')) {
    const parts = trimmed.slice(4).split(',')
    if (parts.length >= 4) {
      const [x, y, t, sw] = parts.map(Number)
      st().setPosition(x, y, t)
      st().setLimitSwitch(sw === 1)
    }
  } else if (trimmed === 'HOMED_Y') {
    st().updateCalibration({ yHomed: true })
  } else if (trimmed === 'X_CAL_DONE') {
    st().updateCalibration({ xCalibrated: true })
  } else if (trimmed === 'TRIG_CAL_DONE') {
    st().updateCalibration({ triggerCalibrated: true })
  }
}

async function startReading(port: SerialPort) {
  _reading = true
  const decoder = new TextDecoder()
  let buffer = ''

  while (_reading && port.readable) {
    const reader = port.readable.getReader()
    _reader = reader
    try {
      while (_reading) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          processLine(line)
        }
      }
    } catch {
      // Port closed or disconnected
    } finally {
      reader.releaseLock()
      _reader = null
    }
    if (!_reading) break
  }
}

export function useSerial() {
  const connect = useCallback(async () => {
    if (!SERIAL_SUPPORTED) return
    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })
      _port = port

      const writer = port.writable.getWriter()
      _writer = writer

      st().setConnected(true)
      st().addLog('⚡ Connected')
      startReading(port)
    } catch (err) {
      st().addLog(`✗ Connect failed: ${err}`)
    }
  }, [])

  const disconnect = useCallback(async () => {
    _reading = false
    try {
      _reader?.cancel()
      _writer?.releaseLock()
      await _port?.close()
    } catch {
      // ignore
    }
    _port = null
    _writer = null
    _reader = null
    st().setConnected(false)
    st().addLog('✗ Disconnected')
  }, [])

  const send = useCallback(async (cmd: string) => {
    if (!_writer) {
      st().addLog(`⚠ Not connected, cannot send: ${cmd}`)
      return
    }
    try {
      const encoded = new TextEncoder().encode(cmd + '\n')
      await _writer.write(encoded)
      st().addLog(`→ ${cmd}`)
    } catch (err) {
      st().addLog(`✗ Send failed: ${err}`)
    }
  }, [])

  return { connect, disconnect, send, supported: SERIAL_SUPPORTED }
}
