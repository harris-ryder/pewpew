import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGunStore } from '../store/gunStore'
import { xStepsToDeg, yStepsToDeg, canvasXToSteps, canvasYToSteps } from '../utils/math'

const COLORS = {
  dark:  { bg: '#1c1c1c', floor: '#1c1c1c', floorGrid: '#292929', canvasBorder: '#484848', canvasGrid: '#323232' },
  light: { bg: '#f2f2f2', floor: '#f2f2f2', floorGrid: '#c8c8c8', canvasBorder: '#c8c8c8', canvasGrid: '#e3e3e3' },
}

const GUN_HEIGHT = 0.3

type AimRef = React.MutableRefObject<{ pan: number; tilt: number }>


// ─── Angle helpers ───────────────────────────────────────────────────────────
//
// Sign convention (verified against Arduino math):
//   Pan  — positive X steps → pan LEFT  → rotation.y should be NEGATIVE in Three.js
//   Tilt — negative Y steps → tilt UP   → rotation.x should be POSITIVE in Three.js
//
// Original code had both wrong (pan un-negated, tilt double-negated).
// Fixed: targetPan = -(x° * π/180),  targetTilt = +(y° * π/180)

function anglesFromSteps(xs: number, ys: number) {
  return {
    pan:  (xStepsToDeg(xs) * Math.PI) / 180,
    tilt: (yStepsToDeg(ys) * Math.PI) / 180,
  }
}

// ─── Gun model ───────────────────────────────────────────────────────────────
function GunModel({ targetPan, targetTilt, aimRef, ghost = false }: {
  targetPan: number
  targetTilt: number
  aimRef: AimRef
  ghost?: boolean
}) {
  const panRef  = useRef<THREE.Group>(null)
  const tiltRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-8 * delta)
    aimRef.current.pan  += (targetPan  - aimRef.current.pan)  * k
    aimRef.current.tilt += (targetTilt - aimRef.current.tilt) * k
    if (panRef.current)  panRef.current.rotation.y  = aimRef.current.pan
    if (tiltRef.current) tiltRef.current.rotation.x = aimRef.current.tilt
  })

  // Ghost: uniformly grayed + transparent. Real: normal colors.
  const mat = ghost
    ? (color: string) => <meshStandardMaterial color={color} opacity={0.07} transparent depthWrite={false} />
    : (color: string) => <meshStandardMaterial color={color} />

  const gc = '#606060' // ghost color — everything the same muted gray

  return (
    <group position={[0, GUN_HEIGHT, 0]}>
      {/* Base plate */}
      <mesh position={[0, -GUN_HEIGHT + 0.025, 0]}>
        <boxGeometry args={[0.6, 0.05, 0.6]} />
        {mat(ghost ? gc : '#c8c8c8')}
      </mesh>
      {/* Center column */}
      <mesh position={[0, -GUN_HEIGHT + 0.09, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.1, 12]} />
        {mat(ghost ? gc : '#b8b8b8')}
      </mesh>

      {/* Pan group — X motor */}
      <group ref={panRef}>
        <mesh>
          <boxGeometry args={[0.28, 0.18, 0.38]} />
          {mat(ghost ? gc : '#e0e0e0')}
        </mesh>
        <mesh position={[ 0.16, 0, 0.05]}>
          <boxGeometry args={[0.04, 0.22, 0.22]} />
          {mat(ghost ? gc : '#d0d0d0')}
        </mesh>
        <mesh position={[-0.16, 0, 0.05]}>
          <boxGeometry args={[0.04, 0.22, 0.22]} />
          {mat(ghost ? gc : '#d0d0d0')}
        </mesh>

        {/* Tilt group — Y motor */}
        <group ref={tiltRef} position={[0, 0.02, 0.04]}>
          <mesh>
            <boxGeometry args={[0.1, 0.1, 0.5]} />
            {mat(ghost ? gc : '#f0f0f0')}
          </mesh>
          <mesh position={[0, 0, -0.7]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.025, 0.03, 0.9, 10]} />
            {mat(ghost ? gc : '#d8d8d8')}
          </mesh>
          {/* Muzzle */}
          <mesh position={[0, 0, -1.16]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.025, 0.04, 8]} />
            {mat(ghost ? gc : '#ffffff')}
          </mesh>
        </group>
      </group>
    </group>
  )
}

// ─── Canvas plane ────────────────────────────────────────────────────────────
//
// Physical layout (matches Arduino math):
//   canvas y=0   → horizontal aim direction → world y = GUN_HEIGHT
//   canvas y=max → top of canvas            → world y = GUN_HEIGHT + hM
//
// The entire group is lifted by GUN_HEIGHT so the canvas never dips below the floor.

function CanvasPlane() {
  const { canvasSettings, target, hits, theme } = useGunStore()
  const c    = COLORS[theme]
  const distM = canvasSettings.distanceMm / 1000
  const wM    = canvasSettings.widthMm    / 1000
  const hM    = canvasSettings.heightMm   / 1000

  // Grid lines with bottom-origin y (0 → hM)
  const gridGeo = useMemo(() => {
    const pts: number[] = []
    const divs = 6
    for (let i = 0; i <= divs; i++) {
      const xT = (i / divs - 0.5) * wM
      const yT =  (i / divs)      * hM
      pts.push(xT, 0,  -distM, xT, hM, -distM)   // vertical
      pts.push(-wM / 2, yT, -distM, wM / 2, yT, -distM)  // horizontal
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
    return geo
  }, [wM, hM, distM])

  // Explicit rectangle border (bottom-origin, not a centered EdgesGeometry)
  const borderGeo = useMemo(() => {
    const x0 = -wM / 2, x1 = wM / 2
    const y0 = 0,        y1 = hM
    const z  = -distM
    const pts = [
      x0, y0, z,  x1, y0, z,
      x1, y0, z,  x1, y1, z,
      x1, y1, z,  x0, y1, z,
      x0, y1, z,  x0, y0, z,
    ]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3))
    return geo
  }, [wM, hM, distM])

  // canvas mm → group-local 3D (x centered, y from 0 at bottom)
  const toLocal = (xMm: number, yMm: number) => ({
    lx: (xMm / canvasSettings.widthMm  - 0.5) * wM,
    ly:  (yMm / canvasSettings.heightMm)       * hM,
  })

  return (
    // Lifted so canvas bottom sits at world y = GUN_HEIGHT
    <group position={[0, GUN_HEIGHT, 0]}>
      {/* Semi-transparent face — centered at (0, hM/2, -distM) in local space */}
      <mesh position={[0, hM / 2, -distM]}>
        <planeGeometry args={[wM, hM]} />
        <meshStandardMaterial color="#ffffff" opacity={0.07} transparent side={THREE.DoubleSide} />
      </mesh>

      <lineSegments geometry={borderGeo}>
        <lineBasicMaterial color={c.canvasBorder} opacity={0.7} transparent />
      </lineSegments>

      <lineSegments geometry={gridGeo}>
        <lineBasicMaterial color={c.canvasGrid} opacity={0.8} transparent />
      </lineSegments>

      {target && (() => {
        const { lx, ly } = toLocal(target.x, target.y)
        return (
          <mesh position={[lx, ly, -distM + 0.01]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#777777" />
          </mesh>
        )
      })()}

      {hits.map(h => {
        const { lx, ly } = toLocal(h.x, h.y)
        return (
          <mesh key={h.id} position={[lx, ly, -distM + 0.005]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color="#777777" />
          </mesh>
        )
      })}
    </group>
  )
}

// ─── Aim line ────────────────────────────────────────────────────────────────
// Raw THREE.Line mutated every frame — tracks the lerped barrel exactly.
function AimLine({ aimRef }: { aimRef: AimRef }) {
  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const mat = new THREE.LineDashedMaterial({
      color: new THREE.Color('#777777'),
      dashSize: 0.08, gapSize: 0.04,
      opacity: 0.7, transparent: true,
    })
    const l = new THREE.Line(geo, mat)
    l.frustumCulled = false
    return l
  }, [])

  useEffect(() => () => {
    line.geometry.dispose()
    ;(line.material as THREE.Material).dispose()
  }, [line])

  useFrame(() => {
    const { pan, tilt } = aimRef.current
    const { distanceMm } = useGunStore.getState().canvasSettings
    const distM = distanceMm / 1000

    const pos = line.geometry.attributes.position as THREE.BufferAttribute
    pos.setXYZ(0, 0, GUN_HEIGHT, 0)
    // Mirror the 2D projection used by canvasXToSteps/canvasYToSteps so the
    // line endpoint always lands exactly on the target dot.
    pos.setXYZ(1, -Math.tan(pan) * distM, GUN_HEIGHT + Math.tan(tilt) * distM, -distM)
    pos.needsUpdate = true
    line.computeLineDistances()
  })

  return <primitive object={line} />
}

// ─── Floor grid ──────────────────────────────────────────────────────────────
const FLOOR_PTS = (() => {
  const pts: number[] = []
  for (let i = -4; i <= 4; i++) {
    pts.push(i, 0, -4, i, 0, 4)
    pts.push(-4, 0, i, 4, 0, i)
  }
  return new Float32Array(pts)
})()

function TransparentBackground() {
  const { gl, scene } = useThree()
  useEffect(() => {
    gl.setClearColor(0x000000, 0)
    scene.background = null
  }, [gl, scene])
  return null
}

// ─── Scene ───────────────────────────────────────────────────────────────────
function Scene() {
  const { posX, posY, theme, target, commandedTarget, canvasSettings } = useGunStore()
  const c = COLORS[theme]

  // Ghost gun: tracks canvas click (target)
  let ghostPan: number, ghostTilt: number
  if (target) {
    const xs = canvasXToSteps(target.x, canvasSettings.widthMm, canvasSettings.distanceMm)
    const ys = canvasYToSteps(target.y, canvasSettings.distanceMm)
    ;({ pan: ghostPan, tilt: ghostTilt } = anglesFromSteps(xs, ys))
  } else {
    ;({ pan: ghostPan, tilt: ghostTilt } = anglesFromSteps(posX, posY))
  }

  // Real gun: tracks commandedTarget (aim/fire button click), falls back to motor steps
  let realPan: number, realTilt: number
  if (commandedTarget) {
    const xs = canvasXToSteps(commandedTarget.x, canvasSettings.widthMm, canvasSettings.distanceMm)
    const ys = canvasYToSteps(commandedTarget.y, canvasSettings.distanceMm)
    ;({ pan: realPan, tilt: realTilt } = anglesFromSteps(xs, ys))
  } else {
    ;({ pan: realPan, tilt: realTilt } = anglesFromSteps(posX, posY))
  }

  // Each gun writes to its own lerped ref; AimLine reads the ghost ref
  const ghostAimRef = useRef({ pan: ghostPan, tilt: ghostTilt })
  const realAimRef  = useRef({ pan: realPan,  tilt: realTilt  })

  return (
    <>
      <TransparentBackground />
      <ambientLight    intensity={theme === 'light' ? 0.6 : 0.3} />
      <directionalLight position={[3, 5, 4]} intensity={theme === 'light' ? 1.2 : 0.9} />
      <pointLight position={[0, GUN_HEIGHT, -0.5]} intensity={0.4} />

      {/* Ghost gun — shows where aim will go on next Aim click */}
      <GunModel targetPan={ghostPan} targetTilt={ghostTilt} aimRef={ghostAimRef} ghost />
      {/* Real gun — only moves after Aim / Aim+Fire */}
      <GunModel targetPan={realPan}  targetTilt={realTilt}  aimRef={realAimRef} />

      <CanvasPlane />
      {/* Dashed aim line follows the ghost so it previews the shot */}
      <AimLine aimRef={ghostAimRef} />

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={FLOOR_PTS} count={72} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color={c.floorGrid} />
      </lineSegments>

      <OrbitControls
        target={[0, GUN_HEIGHT + 0.6, -1.2]}
        minDistance={1}
        maxDistance={12}
        enablePan
      />
    </>
  )
}

// ─── Export ──────────────────────────────────────────────────────────────────
export function GunVisualization() {
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--surface-primary)' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [2.5, 2.5, 4], fov: 50, near: 0.01, far: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
