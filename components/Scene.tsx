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
  const heatRef = useRef(0)
  const lastMousePos = useRef<[number, number]>([0, 0])
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
      radiusSize: { value: 150, min: 50, max: 500, step: 10 },
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

        // Apple's exact logic: set hold to true on EVERY mouse move
        holdRef.current = true

        setMouse([x, y])
        lastMousePos.current = [x, y]
        lastTime.current = performance.now()
      }
    },
    [containerRef]
  )

  const handleDOMPointerLeave = useCallback(() => {
    holdRef.current = false
    // Don't immediately reset heat - let it decay naturally like Apple does
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
    // Apple's logic: heat builds up when moving
    if (holdRef.current) {
      // Apple's exact heat buildup
      const heatIncrease = heatSensitivity * delta * 60
      heatRef.current += heatIncrease
      heatRef.current = Math.min(1.3, heatRef.current) // Apple's max heat limit
      setHeatAmount(heatRef.current)
    } else if (heatRef.current > 0) {
      // Apple's exact decay rate
      heatRef.current *= heatDecay
      heatRef.current = heatRef.current < 0.001 ? 0 : heatRef.current // Apple's cutoff
      setHeatAmount(heatRef.current)
    }

    // Reset hold state after a short time if no movement (like Apple's implementation)
    if (holdRef.current) {
      // Add a small delay before stopping hold to allow for natural movement
      setTimeout(() => {
        holdRef.current = false
      }, 50)
    }
  })

  // Direction calculation from mouse delta (simplified)
  const direction = useMemo<[number, number, number, number]>(() => {
    return [0, 0, 0, 100] // This would be calculated from mouse movement in Apple's code
  }, [])

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
