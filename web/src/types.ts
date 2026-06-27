export interface CornerSteps {
  sx: number  // X motor steps
  sy: number  // Y motor steps
}

export interface Calibration {
  triggerOpen: number
  triggerClose: number
  triggerCalibrated: boolean
  // [bottomLeft, bottomRight, topLeft, topRight] — null = not yet calibrated
  corners: [CornerSteps | null, CornerSteps | null, CornerSteps | null, CornerSteps | null]
  canvasCalibrated: boolean
}

export interface CanvasSettings {
  widthMm: number
  heightMm: number
  distanceMm: number
  tableHeightMm: number
}

export interface TargetPoint {
  x: number  // mm from left edge
  y: number  // mm from bottom edge
}

export interface Hit {
  id: string
  x: number
  y: number
}

export interface GunPosition {
  x: number
  y: number
  trigger: number
}

// Web Serial API (not in stock TS lib)
declare global {
  interface Navigator {
    readonly serial: Serial
  }
  interface Serial extends EventTarget {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
  }
  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[]
  }
  interface SerialPortFilter {
    usbVendorId?: number
    usbProductId?: number
  }
  interface SerialPort extends EventTarget {
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
    readonly readable: ReadableStream<Uint8Array>
    readonly writable: WritableStream<Uint8Array>
  }
  interface SerialOptions {
    baudRate: number
    dataBits?: number
    stopBits?: number
    parity?: 'none' | 'even' | 'odd'
    bufferSize?: number
    flowControl?: 'none' | 'hardware'
  }
}
