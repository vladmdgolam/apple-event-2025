'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

const heatVertexShader = `
precision highp float;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const heatFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform float uHeatAmount;
uniform float uOpacity;
uniform float uPower;
uniform sampler2D uMaskTexture;
uniform sampler2D uHeatTexture;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform vec4 uHeatRange;
uniform vec4 uStretch;

varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  
  // Apply scale and offset transformations like Apple's implementation
  vec2 scaledUv = (uv - 0.5) * uScale + 0.5 + uOffset;
  
  // Sample the Apple logo mask
  vec4 maskColor = texture2D(uMaskTexture, scaledUv);
  float mask = maskColor.a; // Use alpha channel as mask
  
  if (mask < 0.1) {
    discard; // Only render where the logo is
  }
  
  // Mouse interaction
  vec2 mousePos = uMouse * 0.5 + 0.5;
  float distToMouse = distance(uv, mousePos);
  
  // Create heat effect based on Apple's shader logic
  float heatRadius = mix(uHeatRange.x, uHeatRange.y, uHeatAmount);
  float heatFalloff = smoothstep(heatRadius, 0.0, distToMouse);
  
  // Sample heat texture with animation
  vec2 heatUv = uv + vec2(sin(uTime * 0.3) * 0.02, cos(uTime * 0.5) * 0.015);
  vec3 heatColor = texture2D(uHeatTexture, heatUv).rgb;
  
  // Apply stretch effect like Apple
  vec2 stretchedUv = uv;
  stretchedUv.x = mix(uStretch.x, uStretch.y, uv.x);
  stretchedUv.y = mix(uStretch.z, uStretch.w, uv.y);
  
  // Combine colors - white to orange heat
  vec3 baseColor = vec3(1.0, 1.0, 1.0); // White Apple logo
  vec3 hotColor = vec3(1.0, 0.6, 0.2);  // Orange heat
  
  float heatIntensity = heatFalloff * uHeatAmount;
  vec3 finalColor = mix(baseColor, hotColor, heatIntensity);
  
  // Add some noise for organic feel
  float noise = random(uv + uTime * 0.1) * 0.1;
  finalColor += noise * heatIntensity;
  
  // Final opacity with power adjustment
  float alpha = mask * uOpacity * pow(max(0.0, 1.0 - distToMouse), uPower);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`

function AppleLogoHeatmap({ 
  mouse, 
  heatAmount, 
  onPointerMove, 
  onPointerDown, 
  onPointerUp 
}: { 
  mouse: [number, number]
  heatAmount: number
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [opacity, setOpacity] = useState(1.0)
  const [power, setPower] = useState(1.0)
  const timeRef = useRef(0)

  // Load the Apple logo texture
  const maskTexture = useLoader(THREE.TextureLoader, '/logo__dcojfwkzna2q.png')
  
  // Create heat noise texture
  const heatTexture = useMemo(() => {
    const size = 256
    const data = new Uint8Array(size * size * 4)
    
    for (let i = 0; i < size * size; i++) {
      const x = i % size
      const y = Math.floor(i / size)
      
      // Create organic noise pattern
      const noise1 = Math.sin(x * 0.1) * Math.cos(y * 0.1)
      const noise2 = Math.sin(x * 0.05 + y * 0.03) * Math.cos(x * 0.07 - y * 0.05)
      const combined = (noise1 + noise2) * 0.5 * 127 + 128
      
      const index = i * 4
      data[index] = combined * 0.9     // R
      data[index + 1] = combined * 0.7 // G  
      data[index + 2] = combined * 0.5 // B
      data[index + 3] = 255           // A
    }
    
    const texture = new THREE.DataTexture(data, size, size)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.needsUpdate = true
    return texture
  }, [])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: [0, 0] },
        uHeatAmount: { value: 0 },
        uOpacity: { value: 1.0 },
        uPower: { value: 1.0 },
        uMaskTexture: { value: maskTexture },
        uHeatTexture: { value: heatTexture },
        uScale: { value: [1.0, 1.0] },
        uOffset: { value: [0.0, 0.0] },
        uHeatRange: { value: [0.1, 0.3, 0.05, 0.2] }, // inside min, inside max, outside min, outside max
        uStretch: { value: [0.0, 1.0, 0.0, 1.0] } // X min, X max, Y min, Y max
      },
      vertexShader: heatVertexShader,
      fragmentShader: heatFragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    })
  }, [maskTexture, heatTexture])

  // Expose controls for external manipulation (like Apple's implementation)
  useEffect(() => {
    if (material) {
      material.uniforms.uMouse.value = mouse
      material.uniforms.uHeatAmount.value = heatAmount
      material.uniforms.uOpacity.value = opacity
      material.uniforms.uPower.value = power
    }
  }, [material, mouse, heatAmount, opacity, power])

  useFrame((state, delta) => {
    timeRef.current += delta
    
    if (material) {
      material.uniforms.uTime.value = timeRef.current
    }
  })

  return (
    <mesh 
      ref={meshRef} 
      scale={[3, 3, 1]}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <planeGeometry args={[1, 1, 64, 64]} />
      <primitive object={material} />
    </mesh>
  )
}

interface SceneProps {
  onMouseUpdate?: (mouse: [number, number]) => void
  onHeatUpdate?: (heat: number) => void
}

function Scene({ onMouseUpdate, onHeatUpdate }: SceneProps) {
  const [mouse, setMouse] = useState<[number, number]>([0, 0])
  const [isHolding, setIsHolding] = useState(false)
  const [heatAmount, setHeatAmount] = useState(0)
  const heatAccumulator = useRef(0)
  const { camera, viewport } = useThree()

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    // Convert Three.js event to normalized coordinates (-1 to 1)
    const normalizedX = (e.point.x / (viewport.width / 2))
    const normalizedY = (e.point.y / (viewport.height / 2))
    
    const newMouse: [number, number] = [normalizedX, normalizedY]
    setMouse(newMouse)
    onMouseUpdate?.(newMouse)
    
    if (isHolding) {
      heatAccumulator.current += 0.05 // Heat buildup rate
      const newHeat = Math.min(1.3, heatAccumulator.current)
      setHeatAmount(newHeat)
      onHeatUpdate?.(newHeat)
    }
  }, [isHolding, onMouseUpdate, onHeatUpdate, viewport])

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    setIsHolding(true)
  }, [])

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    setIsHolding(false)
  }, [])

  useFrame(() => {
    if (!isHolding && heatAmount > 0) {
      heatAccumulator.current *= 0.95 // Apple's decay rate
      const newHeat = Math.max(0, heatAccumulator.current)
      setHeatAmount(newHeat)
      onHeatUpdate?.(newHeat)
    }
  })

  // Set up orthographic camera for proper logo display
  useEffect(() => {
    if (camera) {
      camera.position.set(0, 0, 2)
    }
  }, [camera])

  return (
    <>
      <AppleLogoHeatmap 
        mouse={mouse}
        heatAmount={heatAmount}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
    </>
  )
}

export function AppleHeatmapScene() {
  const [debugInfo, setDebugInfo] = useState({ mouse: [0, 0], heat: 0 })

  return (
    <div className="w-full h-screen bg-black relative flex items-center justify-center">
      {/* Debug info */}
      <div className="absolute top-4 left-4 text-white text-sm font-mono z-10">
        <div>Mouse: ({debugInfo.mouse[0].toFixed(2)}, {debugInfo.mouse[1].toFixed(2)})</div>
        <div>Heat: {debugInfo.heat.toFixed(2)}</div>
        <div>Hold and drag to create heat effect</div>
      </div>

      <div className="w-96 h-96">
        <Canvas
          camera={{ 
            position: [0, 0, 2], 
            fov: 50,
            near: 0.1,
            far: 1000
          }}
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance'
          }}
        >
          <Scene 
            onMouseUpdate={(mouse) => setDebugInfo(prev => ({ ...prev, mouse }))}
            onHeatUpdate={(heat) => setDebugInfo(prev => ({ ...prev, heat }))}
          />
        </Canvas>
      </div>
    </div>
  )
}