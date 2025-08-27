"use client"

import { Canvas } from "@react-three/fiber"
import { Leva } from "leva"
import { useEffect, useRef, useState } from "react"
import { InfoPanel } from "./InfoPanel"
import { Scene } from "./Scene"


export const AppleExactHeatmap = () => {
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
      <InfoPanel />

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
