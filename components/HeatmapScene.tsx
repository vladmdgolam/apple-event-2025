"use client"

import { Canvas } from "@react-three/fiber"
import { Leva, levaStore } from "leva"
import { useCallback, useEffect, useRef, useState } from "react"

import { InfoPanel } from "./InfoPanel"
import { Scene } from "./Scene"

export const HeatmapScene = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [levaHidden, setLevaHidden] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // L key toggle for Leva
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "l" || e.key === "L") {
        setLevaHidden((prev) => !prev)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [])

  // Randomize gradient colors for the heat map
  const randomizeColors = useCallback(() => {
    const hslToHex = (h: number, s: number, l: number) => {
      s /= 100
      l /= 100
      const k = (n: number) => (n + h / 30) % 12
      const a = s * Math.min(l, 1 - l)
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
      const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0")
      return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
    }

    const base = Math.floor(Math.random() * 360)
    // Generate 6 colors for color2..color7; keep color1 (black) intact
    const steps = [15, 35, 55, 85, 140, 200]
    const palette = steps.map((step, i) =>
      hslToHex((base + step) % 360, 80 - i * 4, 50 + (i - 3) * 3)
    )

    const keys = ["color2", "color3", "color4", "color5", "color6", "color7"] as const

    keys.forEach((key, i) => {
      try {
        levaStore.setValueAtPath(`Heat Map.${key}`, palette[i])
      } catch (e) {
        // no-op if control not yet mounted
      }
    })
  }, [])

  // R key to randomize colors
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        randomizeColors()
      }
    }
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [randomizeColors])

  if (!isClient) {
    return (
      <div className="w-full h-screen bg-black relative flex items-center justify-center">
        <InfoPanel />
        <div className="w-[390px] h-[390px] bg-black" />
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-black relative flex items-center justify-center">
      <Leva hidden={levaHidden} />
      <InfoPanel onToggleControls={() => setLevaHidden((p) => !p)} onRandomizeColors={randomizeColors} />

      {/* Square canvas like Apple's implementation */}
      <div ref={containerRef} className="w-[390px] h-[390px] touch-none select-none">
        <Canvas
          orthographic
          camera={{
            position: [0, 0, 1],
            left: -2,
            right: 2,
            top: 2,
            bottom: -2,
            near: -1,
            far: 1,
          }}
          gl={{
            antialias: true,
            alpha: true,
            outputColorSpace: "srgb",
          }}
          flat
        >
          <Scene containerRef={containerRef} />
        </Canvas>
      </div>
    </div>
  )
}
