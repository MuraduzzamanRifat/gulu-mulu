'use client'

import * as React from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, Html, useGLTF, useProgress } from '@react-three/drei'

import { cn } from '@/lib/utils'

/**
 * The heavy WebGL half of the 3D product viewer. Split into its own module and loaded ONLY
 * via next/dynamic(ssr:false) after the shopper taps "View in 3D" — so `three` (a large
 * dependency) is never in the product page's initial bundle and no WebGL context is created
 * for the ~everyone who doesn't opt in. That gating is the whole reason 3D is safe on a
 * mobile-first, performance-tuned storefront.
 *
 * Demo asset: the Khronos MaterialsVariantsShoe (a rigid good — the honest category for 3D),
 * compressed to ~900KB webp. Real per-product models get dropped into /public/models later;
 * this component takes a `src`, so wiring a new one is a one-line change.
 */

const DEFAULT_MODEL = '/models/shoe.glb'

/** Minimal shape of the KHR_materials_variants glTF extension we read for colourways. */
interface VariantsExtension {
  variants: { name: string }[]
}
interface MeshVariantMapping {
  mappings: { material: number; variants: number[] }[]
}

/** The bits of the parsed glTF we actually touch (three's types don't surface these cleanly). */
interface GLTFResult {
  scene: THREE.Group
  parser: { getDependency: (type: string, index: number) => Promise<THREE.Material> }
  userData: { gltfExtensions?: { KHR_materials_variants?: VariantsExtension } }
}

function ProgressPill() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="rounded-full bg-ink/85 px-3 py-1 text-2xs font-semibold text-white tabular-nums">
        {Math.round(progress)}%
      </div>
    </Html>
  )
}

function Shoe({
  src,
  variantIndex,
  onVariantsFound,
}: {
  src: string
  variantIndex: number
  onVariantsFound: (names: string[]) => void
}) {
  const gltf = useGLTF(src) as unknown as GLTFResult
  const { scene, parser, userData } = gltf

  // Surface the colourway names to the parent once the model is parsed.
  React.useEffect(() => {
    const ext = userData?.gltfExtensions?.KHR_materials_variants
    if (ext?.variants?.length) onVariantsFound(ext.variants.map((v) => v.name))
  }, [userData, onVariantsFound])

  // Swap materials to the selected colourway (canonical three.js KHR_materials_variants pattern).
  React.useEffect(() => {
    let cancelled = false
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh & {
        userData: {
          gltfExtensions?: { KHR_materials_variants?: MeshVariantMapping }
          originalMaterial?: THREE.Material | THREE.Material[]
        }
      }
      const def = mesh.userData?.gltfExtensions?.KHR_materials_variants
      if (!def || !(mesh as THREE.Mesh).isMesh) return
      if (!mesh.userData.originalMaterial) mesh.userData.originalMaterial = mesh.material
      const mapping = def.mappings.find((m) => m.variants.includes(variantIndex))
      void (async () => {
        try {
          const material = mapping
            ? await parser.getDependency('material', mapping.material)
            : mesh.userData.originalMaterial
          if (!cancelled && material) mesh.material = material as THREE.Material
        } catch {
          /* fall back to whatever is on the mesh */
        }
      })()
    })
    return () => {
      cancelled = true
    }
  }, [scene, parser, variantIndex])

  return <primitive object={scene} />
}

export default function ShoeCanvas({ src = DEFAULT_MODEL }: { src?: string }) {
  const [variants, setVariants] = React.useState<string[]>([])
  const [variantIndex, setVariantIndex] = React.useState(0)
  const [reducedMotion, setReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(q.matches)
    sync()
    q.addEventListener('change', sync)
    return () => q.removeEventListener('change', sync)
  }, [])

  const onVariantsFound = React.useCallback((names: string[]) => setVariants(names), [])

  return (
    <div className="relative size-full">
      <Canvas
        // Cap device-pixel-ratio: retina phones would otherwise render at 3x and roast the GPU.
        dpr={[1, 1.6]}
        shadows
        camera={{ position: [0, 0.1, 2.5], fov: 40 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-label="Interactive 3D product view. Drag to rotate."
      >
        <color attach="background" args={['#fff7fa']} />
        <React.Suspense fallback={<ProgressPill />}>
          {/* Stage auto-frames the model and gives it studio lighting + a contact shadow. */}
          <Stage environment="city" intensity={0.4} adjustCamera={1.15} shadows="contact">
            <Shoe src={src} variantIndex={variantIndex} onVariantsFound={onVariantsFound} />
          </Stage>
        </React.Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          minDistance={1.4}
          maxDistance={4.5}
          // A slow idle spin sells the 3D-ness — but never for someone who asked for less motion.
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.7}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI - Math.PI / 6}
        />
      </Canvas>

      {variants.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
          <span className="sr-only">Choose a colourway</span>
          {variants.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => setVariantIndex(i)}
              aria-pressed={i === variantIndex}
              title={name}
              className={cn(
                'grid h-11 min-w-11 place-items-center rounded-full border px-3 text-xs font-medium capitalize transition-colors',
                'focus-visible:ring-2 focus-visible:ring-brand-500 outline-hidden',
                i === variantIndex
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-line bg-white/90 text-ink-muted hover:border-brand-300 hover:text-ink',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

useGLTF.preload(DEFAULT_MODEL)
