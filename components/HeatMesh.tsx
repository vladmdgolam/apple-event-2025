"use client"

import heatFragmentShader from "@/shaders/heat.frag"
import heatVertexShader from "@/shaders/heat.vert"
import { useFrame, useLoader } from "@react-three/fiber"
import { useControls } from "leva"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DoubleSide,
  LinearFilter,
  Mesh,
  RGBFormat,
  RepeatWrapping,
  ShaderMaterial,
  Texture,
  TextureLoader,
  VideoTexture,
} from "three"

export const HeatMesh = ({ drawTexture }: { drawTexture: Texture | null }) => {
  const meshRef = useRef<Mesh>(null)
  const timeRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoTexture, setVideoTexture] = useState<VideoTexture | null>(null)

  // Leva controls for shader parameters
  const {
    power,
    opacity,
    scaleX,
    scaleY,
    offsetX,
    offsetY,
    color1,
    color2,
    color3,
    color4,
    color5,
    color6,
    color7,
    blend1,
    blend2,
    blend3,
    blend4,
    fade1,
    fade2,
    fade3,
    fade4,
    maxBlend1,
    maxBlend2,
    maxBlend3,
    maxBlend4,
  } = useControls("Heat Map", {
    power: { value: 0.8, min: 0.1, max: 2.0, step: 0.01 },
    opacity: { value: 1.0, min: 0.0, max: 1.0, step: 0.01 },
    scaleX: { value: 1.0, min: 0.1, max: 3.0, step: 0.01 },
    scaleY: { value: 1.0, min: 0.1, max: 3.0, step: 0.01 },
    offsetX: { value: 0.0, min: -1.0, max: 1.0, step: 0.001 },
    offsetY: { value: 0.0, min: -1.0, max: 1.0, step: 0.001 },
    color1: "#000000",
    color2: "#073dff",
    color3: "#53d5fd",
    color4: "#fefcdd",
    color5: "#ffec6a",
    color6: "#f9d400",
    color7: "#a61904",
    blend1: { value: 0.4, min: 0.0, max: 1.0, step: 0.001 },
    blend2: { value: 0.7, min: 0.0, max: 1.0, step: 0.001 },
    blend3: { value: 0.81, min: 0.0, max: 1.0, step: 0.001 },
    blend4: { value: 0.91, min: 0.0, max: 1.0, step: 0.001 },
    fade1: { value: 1.0, min: 0.0, max: 2.0, step: 0.001 },
    fade2: { value: 1.0, min: 0.0, max: 2.0, step: 0.001 },
    fade3: { value: 0.72, min: 0.0, max: 2.0, step: 0.001 },
    fade4: { value: 0.52, min: 0.0, max: 2.0, step: 0.001 },
    maxBlend1: { value: 0.8, min: 0.0, max: 1.0, step: 0.001 },
    maxBlend2: { value: 0.87, min: 0.0, max: 1.0, step: 0.001 },
    maxBlend3: { value: 0.5, min: 0.0, max: 2.0, step: 0.001 },
    maxBlend4: { value: 0.27, min: 0.0, max: 2.0, step: 0.001 },
  })

  // Convert hex colors to RGB arrays
  const hexToRGB = useCallback((hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255,
        ]
      : [0, 0, 0]
  }, [])

  // Load Apple logo exactly like they do
  const maskTexture = useLoader(TextureLoader, "/logo__dcojfwkzna2q.png")

  // Setup video texture like Apple's implementation
  useEffect(() => {
    const video = document.createElement("video")
    video.src = "/large_2x.mp4"
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.autoplay = true

    // Apple sets video to preload and configure
    video.preload = "auto"
    video.crossOrigin = "anonymous"

    const onVideoLoad = () => {
      const texture = new VideoTexture(video)
      texture.minFilter = LinearFilter
      texture.magFilter = LinearFilter
      texture.format = RGBFormat
      texture.flipY = true // Try flipping the video texture
      // Apple's exact texture wrapping like getBlurTexture()
      texture.wrapS = texture.wrapT = RepeatWrapping
      setVideoTexture(texture)
    }

    video.addEventListener("loadeddata", onVideoLoad)
    video.load()

    // Start playing when ready
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay was prevented, that's ok
      })
    }

    videoRef.current = video

    return () => {
      video.removeEventListener("loadeddata", onVideoLoad)
      video.pause()
      video.src = ""
    }
  }, [])

  useEffect(() => {
    if (maskTexture) {
      maskTexture.wrapS = maskTexture.wrapT = RepeatWrapping
      maskTexture.needsUpdate = true
    }
  }, [maskTexture])

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        blendVideo: { value: 1.0 },
        drawMap: { value: drawTexture },
        textureMap: { value: videoTexture || maskTexture },
        maskMap: { value: maskTexture },
        scale: { value: [scaleX, scaleY] },
        offset: { value: [offsetX, offsetY] },
        opacity: { value: opacity },
        amount: { value: 1.0 },
        color1: { value: hexToRGB(color1) },
        color2: { value: hexToRGB(color2) },
        color3: { value: hexToRGB(color3) },
        color4: { value: hexToRGB(color4) },
        color5: { value: hexToRGB(color5) },
        color6: { value: hexToRGB(color6) },
        color7: { value: hexToRGB(color7) },
        blend: { value: [blend1, blend2, blend3, blend4] },
        fade: { value: [fade1, fade2, fade3, fade4] },
        power: { value: power },
        rnd: { value: 0 },
        maxBlend: { value: [maxBlend1, maxBlend2, maxBlend3, maxBlend4] },
        heat: { value: [0, 0, 0, 1.02] },
        stretch: { value: [1, 1, 0, 0] },
      },
      vertexShader: heatVertexShader,
      fragmentShader: heatFragmentShader,
      transparent: true,
      side: DoubleSide,
    })
  }, [
    maskTexture,
    drawTexture,
    videoTexture,
    scaleX,
    scaleY,
    offsetX,
    offsetY,
    opacity,
    power,
    color1,
    color2,
    color3,
    color4,
    color5,
    color6,
    color7,
    blend1,
    blend2,
    blend3,
    blend4,
    fade1,
    fade2,
    fade3,
    fade4,
    maxBlend1,
    maxBlend2,
    maxBlend3,
    maxBlend4,
    hexToRGB,
  ])

  useFrame((_, delta) => {
    timeRef.current += delta
    if (material) {
      material.uniforms.rnd.value = Math.random()
      material.uniforms.amount.value = 1.0
    }
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry />
      <primitive object={material} />
    </mesh>
  )
}
