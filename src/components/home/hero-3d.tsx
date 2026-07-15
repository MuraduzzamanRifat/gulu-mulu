'use client'

import * as React from 'react'
import { Canvas } from '@react-three/fiber'
import { Float, MeshDistortMaterial } from '@react-three/drei'

/**
 * The one real WebGL moment on the storefront — a cluster of soft, slowly-morphing forms in the
 * brand palette, drifting behind the hero headline as an ambient accent. Not a product, not a
 * gimmick: it's decorative depth, the boutique equivalent of a lit backdrop.
 *
 * Guard-railed hard, because the hero is the LCP element and mobile is the majority:
 *   - loaded via next/dynamic(ssr:false) AFTER first paint, so it never blocks the banner image
 *   - rendered DESKTOP/TABLET only (the parent hides it on phones) — phones get CSS depth instead,
 *     never a WebGL context
 *   - alpha canvas, pointer-events:none, low opacity + blur via the parent, so it can sit over any
 *     banner photo without fighting it
 *   - a single tiny scene (3 low-poly spheres); dpr capped so retina doesn't render at 3x
 *   - stands down for prefers-reduced-motion (parent renders nothing)
 */

function Blob({
  position,
  color,
  scale,
  speed,
}: {
  position: [number, number, number]
  color: string
  scale: number
  speed: number
}) {
  return (
    <Float speed={speed} rotationIntensity={0.5} floatIntensity={1.1}>
      <mesh position={position} scale={scale}>
        <sphereGeometry args={[1, 48, 48]} />
        <MeshDistortMaterial
          color={color}
          distort={0.38}
          speed={1.3}
          roughness={0.15}
          metalness={0.05}
          transparent
          opacity={0.9}
        />
      </mesh>
    </Float>
  )
}

export default function Hero3D() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 3]} intensity={1.1} />
      <Blob position={[1.7, 0.4, 0]} color="#FF4F8B" scale={1.35} speed={1.5} />
      <Blob position={[2.9, -0.9, -1.2]} color="#D4AF37" scale={0.7} speed={2.1} />
      <Blob position={[0.9, -1.2, -0.6]} color="#FFE4EC" scale={0.95} speed={1.8} />
    </Canvas>
  )
}
