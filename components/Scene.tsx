"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useControls } from "leva"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { OrthographicCamera, Texture } from "three"

import { DrawRenderer } from "./DrawRenderer"
import { HeatMesh } from "./HeatMesh"

export const Scene = ({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
}) => {
  const [mouse, setMouse] = useState<[number, number]>([0, 0])
  const [heatAmount, setHeatAmount] = useState(0)
  const [drawTexture, setDrawTexture] = useState<Texture | null>(null)
  const [direction, setDirection] = useState<[number, number, number, number]>([0, 0, 0, 100])
  const heatRef = useRef(0)
  const lastMousePos = useRef<[number, number]>([0.5, 0.5])
  const lastTime = useRef(performance.now())
  const holdRef = useRef(false)
  const { camera, size } = useThree((state) => ({ camera: state.camera, size: state.size }))

  const { sizeDamping, fadeDamping, heatSensitivity, heatDecay, radiusSize } = useControls(
    "Hover Heat",
    {
      sizeDamping: { value: 0.8, min: 0.0, max: 1.0, step: 0.01 },
      fadeDamping: { value: 0.98, min: 0.9, max: 1.0, step: 0.001 },
      heatSensitivity: { value: 0.5, min: 0.1, max: 2.0, step: 0.05 },
      heatDecay: { value: 0.95, min: 0.8, max: 0.99, step: 0.01 },
      radiusSize: { value: 85, min: 20, max: 300, step: 5 },
    }
  )

  // Apple's exact camera setup for orthographic projection
  useEffect(() => {
    if (camera && camera instanceof OrthographicCamera) {
      const aspect = size.width / size.height
      let width, height

      if (aspect >= 1) {
        height = 1
        width = aspect
      } else {
        width = 1
        height = 1 / aspect
      }

      camera.left = -width / 2
      camera.right = width / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.near = -1
      camera.far = 1
      camera.updateProjectionMatrix()
    }
  }, [camera, size])

  // Apple's gesture controller approach - DOM-based mouse handling with speed detection
  const handleDOMPointerMove = useCallback(
    (e: PointerEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const clientX = e.clientX - rect.x
        const clientY = e.clientY - rect.y

        // Apple's exact normalization
        const normalizedX = clientX / rect.width
        const normalizedY = clientY / rect.height

        // Apple's coordinate conversion
        const x = 2 * (normalizedX - 0.5)
        const y = 2 * -(normalizedY - 0.5) // Apple's exact Y inversion

        // Calculate movement delta for direction (like reference impl)
        const deltaX = normalizedX - lastMousePos.current[0]
        const deltaY = normalizedY - lastMousePos.current[1]

        // Update direction with movement deltas (w component is multiplier)
        setDirection([deltaX, deltaY, 0, 100])

        // Set hold to true on mouse move
        holdRef.current = true

        setMouse([x, y])
        lastMousePos.current = [normalizedX, normalizedY]
        lastTime.current = performance.now()
      }
    },
    [containerRef]
  )

  const handleDOMPointerLeave = useCallback(() => {
    holdRef.current = false
    // Reset direction when leaving
    setDirection([0, 0, 0, 100])
  }, [])

  // Set up DOM event listeners like Apple
  useEffect(() => {
    const canvas = containerRef.current
    if (!canvas) return

    canvas.addEventListener("pointermove", handleDOMPointerMove)
    canvas.addEventListener("pointerleave", handleDOMPointerLeave)

    return () => {
      canvas.removeEventListener("pointermove", handleDOMPointerMove)
      canvas.removeEventListener("pointerleave", handleDOMPointerLeave)
    }
  }, [handleDOMPointerMove, handleDOMPointerLeave, containerRef])

  useFrame((_, delta) => {
    const now = performance.now()
    const timeSinceLastMove = now - lastTime.current

    // Only consider "moving" if there was recent mouse activity (within 50ms)
    const isMoving = holdRef.current && timeSinceLastMove < 50

    // Apple's logic: heat builds up when actively moving
    if (isMoving) {
      // Heat buildup matching reference implementation
      const heatIncrease = heatSensitivity * delta * 60
      heatRef.current += heatIncrease
      heatRef.current = Math.min(1.3, heatRef.current) // Apple's max heat limit
      setHeatAmount(heatRef.current)
    } else if (heatRef.current > 0) {
      // Heat decay when not actively moving
      heatRef.current *= heatDecay
      heatRef.current = heatRef.current < 0.001 ? 0 : heatRef.current // Apple's cutoff
      setHeatAmount(heatRef.current)
    }

    // Reset direction each frame (it gets set fresh on mouse move)
    // This prevents stale direction values from persisting
    setDirection((prev) => (prev[0] !== 0 || prev[1] !== 0 ? [0, 0, 0, 100] : prev))
  })

  const drawPosition = useMemo<[number, number]>(() => {
    const x = 0.5 * mouse[0] + 0.5
    const y = 0.5 * mouse[1] + 0.5
    return [x, y]
  }, [mouse])

  return (
    <>
      <DrawRenderer
        size={256}
        position={drawPosition}
        direction={direction}
        drawAmount={heatAmount}
        onTextureUpdate={setDrawTexture}
        sizeDamping={sizeDamping}
        fadeDamping={fadeDamping}
        radiusSize={radiusSize}
      />
      <HeatMesh drawTexture={drawTexture} />
    </>
  )
}
