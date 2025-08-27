"use client"

import drawFragmentShader from "@/shaders/draw.frag"
import drawVertexShader from "@/shaders/draw.vert"
import heatFragmentShader from "@/shaders/heat.frag"
// Import shaders
import heatVertexShader from "@/shaders/heat.vert"
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber"
import { Leva, useControls } from "leva"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

// Mobile detection utility like Apple's Ia.isMobile()
const isMobile = () => {
  if (typeof window === "undefined") return false
  return "ontouchstart" in window || navigator.maxTouchPoints > 0
}

function DrawRenderer({
  size = 256,
  position,
  direction,
  drawAmount,
  onTextureUpdate,
  sizeDamping,
  fadeDamping,
  radiusSize,
}: {
  size?: number
  position: [number, number]
  direction: [number, number, number, number]
  drawAmount: number
  onTextureUpdate: (texture: THREE.Texture) => void
  sizeDamping: number
  fadeDamping: number
  radiusSize: number
}) {
  const { gl, size: canvasSize } = useThree()

  // Apple's exact radius (line 42 in clean.js) - use controllable value
  const dynamicRadius = radiusSize

  const renderTargets = useMemo(() => {
    const rtA = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })
    const rtB = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })
    return { current: rtA, previous: rtB }
  }, [size])

  const { scene, camera, material } = useMemo(() => {
    // Apple's exact draw renderer setup
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10)
    camera.position.z = 1

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uRadius: { value: [-8, 0.9, dynamicRadius] }, // Use mobile-aware radius
        uPosition: { value: [0, 0] },
        uDirection: { value: [0, 0, 0, 0] },
        uResolution: { value: [canvasSize.width, canvasSize.height, 1] },
        uTexture: { value: renderTargets.previous.texture },
        uSizeDamping: { value: sizeDamping },
        uFadeDamping: { value: fadeDamping },
        uDraw: { value: 0 },
      },
      vertexShader: drawVertexShader,
      fragmentShader: drawFragmentShader,
      depthTest: false,
      transparent: true,
    })

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
    scene.add(mesh)

    return { scene, camera, material }
  }, [size, renderTargets, dynamicRadius, sizeDamping, fadeDamping, radiusSize, canvasSize])

  // Update radius when it changes
  useEffect(() => {
    material.uniforms.uRadius.value[2] = dynamicRadius
  }, [material, dynamicRadius])

  useEffect(() => {
    material.uniforms.uPosition.value = position
    material.uniforms.uDirection.value = direction
    material.uniforms.uDraw.value = drawAmount
  }, [material, position, direction, drawAmount])

  useFrame(() => {
    // Ping-pong rendering like Apple
    const currentTarget = renderTargets.current
    const previousTarget = renderTargets.previous

    material.uniforms.uTexture.value = previousTarget.texture

    const originalTarget = gl.getRenderTarget()
    gl.setRenderTarget(currentTarget)
    gl.clear()
    gl.render(scene, camera)
    gl.setRenderTarget(originalTarget)

    // Swap targets
    const temp = renderTargets.current
    renderTargets.current = renderTargets.previous
    renderTargets.previous = temp

    onTextureUpdate(currentTarget.texture)
  })

  return null
}

function AppleHeatMesh({ drawTexture }: { drawTexture: THREE.Texture | null }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null)

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
  const maskTexture = useLoader(THREE.TextureLoader, "/logo__dcojfwkzna2q.png")

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
      const texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBFormat
      texture.flipY = true // Try flipping the video texture
      // Apple's exact texture wrapping like getBlurTexture()
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
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
      maskTexture.wrapS = maskTexture.wrapT = THREE.RepeatWrapping
      maskTexture.needsUpdate = true
    }
  }, [maskTexture])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
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
      side: THREE.DoubleSide,
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
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[1, 1, 1]}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} />
    </mesh>
  )
}

function Scene({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [mouse, setMouse] = useState<[number, number]>([0, 0])
  const [heatAmount, setHeatAmount] = useState(0)
  const [drawTexture, setDrawTexture] = useState<THREE.Texture | null>(null)
  const heatRef = useRef(0)
  const lastMousePos = useRef<[number, number]>([0, 0])
  const lastTime = useRef(performance.now())
  const holdRef = useRef(false)
  const { camera, size } = useThree()

  // Get draw renderer controls
  const { sizeDamping, fadeDamping, heatSensitivity, heatDecay, radiusSize } = useControls("Hover Heat", {
    sizeDamping: { value: 0.8, min: 0.0, max: 1.0, step: 0.01 },
    fadeDamping: { value: 0.98, min: 0.9, max: 1.0, step: 0.001 },
    heatSensitivity: { value: 0.5, min: 0.1, max: 2.0, step: 0.05 },
    heatDecay: { value: 0.95, min: 0.8, max: 0.99, step: 0.01 },
    radiusSize: { value: 150, min: 50, max: 500, step: 10 },
  })

  // Apple's exact camera setup for orthographic projection
  useEffect(() => {
    if (camera && camera instanceof THREE.OrthographicCamera) {
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

        // Apple's exact normalization (line 228-229 in clean.js)
        const normalizedX = clientX / rect.width
        const normalizedY = clientY / rect.height

        // Apple's coordinate conversion (line 496-497)
        const x = 2 * (normalizedX - 0.5)
        const y = 2 * -(normalizedY - 0.5) // Apple's exact Y inversion

        // Apple's exact logic: set hold to true on EVERY mouse move (line 503 in clean.js)
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
  }, [
    handleDOMPointerMove,
    handleDOMPointerLeave,
    containerRef,
  ])

  useFrame((_, delta) => {
    // Apple's logic: heat builds up when moving
    if (holdRef.current) {
      // Apple's exact heat buildup (line 571: this.heatUp += 0.5 * t * 60)
      const heatIncrease = heatSensitivity * delta * 60
      heatRef.current += heatIncrease
      heatRef.current = Math.min(1.3, heatRef.current) // Apple's max heat limit
      setHeatAmount(heatRef.current)
    } else if (heatRef.current > 0) {
      // Apple's exact decay rate (lines 613-614 in clean.js)
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

  // Apple's updatePosition conversion: from [-1,1] to [0,1]
  const drawPosition = useMemo<[number, number]>(() => {
    const x = 0.5 * mouse[0] + 0.5 // Apple's exact conversion (line 72)
    const y = 0.5 * mouse[1] + 0.5 // Apple's exact conversion (line 72)
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
      <AppleHeatMesh drawTexture={drawTexture} />
    </>
  )
}

export function AppleExactHeatmap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [levaHidden, setLevaHidden] = useState(true)

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

  return (
    <div className="w-full h-screen bg-black relative flex items-center justify-center">
      <Leva hidden={levaHidden} />
      <div className="absolute top-4 left-4 text-white text-sm font-mono z-10">
        <div>Hold and drag for heat effect</div>
        <div>Press L to toggle controls</div>
      </div>

      {/* Square canvas like Apple's implementation */}
      <div ref={containerRef} className="w-[80vmin] h-[80vmin] touch-none">
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
            antialias: false,
            alpha: true,
            powerPreference: "high-performance",
          }}
        >
          <Scene containerRef={containerRef} />
        </Canvas>
      </div>
    </div>
  )
}
