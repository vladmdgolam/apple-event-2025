'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GestureController } from './GestureController'

const heatmapVertexShader = `
precision highp float;
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const heatmapFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform float uHeatAmount;
uniform float uOpacity;
uniform vec3 uColor;
uniform sampler2D uHeatTexture;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vec2 mousePos = uMouse * 0.5 + 0.5; // Convert from -1,1 to 0,1
  float dist = distance(vUv, mousePos);
  
  // Sample from heat texture (simulated)
  vec2 heatUv = vUv + vec2(sin(uTime * 0.5) * 0.02, cos(uTime * 0.3) * 0.02);
  vec3 heatColor = texture2D(uHeatTexture, heatUv).rgb;
  
  // Create radial heat effect
  float heatRadius = 0.3;
  float heatFalloff = smoothstep(heatRadius, 0.0, dist);
  
  // Combine colors
  vec3 finalColor = mix(uColor, vec3(1.0, 0.4, 0.1), heatFalloff * uHeatAmount);
  finalColor = mix(finalColor, heatColor, 0.3);
  
  float alpha = uOpacity * (0.7 + heatFalloff * 0.3);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`

function HeatmapMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const [mouse, setMouse] = useState([0, 0])
  const [heatAmount, setHeatAmount] = useState(0)
  const timeRef = useRef(0)

  // Create a simple noise texture for heat effect
  const heatTexture = useMemo(() => {
    const size = 256
    const data = new Uint8Array(size * size * 4)
    
    for (let i = 0; i < size * size; i++) {
      const x = i % size
      const y = Math.floor(i / size)
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 127 + 128
      const index = i * 4
      
      data[index] = noise * 0.8     // R
      data[index + 1] = noise * 0.6 // G
      data[index + 2] = noise * 0.4 // B
      data[index + 3] = 255         // A
    }
    
    const texture = new THREE.DataTexture(data, size, size)
    texture.needsUpdate = true
    return texture
  }, [])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: [0, 0] },
        uHeatAmount: { value: 0 },
        uOpacity: { value: 0.8 },
        uColor: { value: [0.1, 0.1, 0.2] },
        uHeatTexture: { value: heatTexture }
      },
      vertexShader: heatmapVertexShader,
      fragmentShader: heatmapFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
  }, [heatTexture])

  useFrame((state, delta) => {
    timeRef.current += delta
    
    if (material) {
      material.uniforms.uTime.value = timeRef.current
      material.uniforms.uMouse.value = mouse
      material.uniforms.uHeatAmount.value = heatAmount
      
      // Gradual heat decay
      setHeatAmount(prev => Math.max(0, prev * 0.95))
    }
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[4, 4, 32, 32]} />
      <primitive object={material} />
    </mesh>
  )
}

function Scene() {
  const [mouse, setMouse] = useState([0, 0])
  const [isHolding, setIsHolding] = useState(false)
  const [heatAmount, setHeatAmount] = useState(0)
  const heatAccumulator = useRef(0)

  const handleGestureMove = useCallback((data: any) => {
    const normalizedX = 2 * (data.normalizedPosition.x - 0.5)
    const normalizedY = 2 * -(data.normalizedPosition.y - 0.5)
    
    setMouse([normalizedX, normalizedY])
    
    if (isHolding) {
      heatAccumulator.current += 0.05
      setHeatAmount(Math.min(1.3, heatAccumulator.current))
    }
  }, [isHolding])

  const handleGestureDown = useCallback(() => {
    setIsHolding(true)
  }, [])

  const handleGestureUp = useCallback(() => {
    setIsHolding(false)
  }, [])

  const handleGestureLeave = useCallback(() => {
    setIsHolding(false)
    heatAccumulator.current = 0
    setHeatAmount(0)
  }, [])

  useFrame(() => {
    if (!isHolding) {
      heatAccumulator.current *= 0.95
      setHeatAmount(heatAccumulator.current)
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <HeatmapMesh />
    </>
  )
}

export function HeatmapScene() {
  return (
    <div className="w-full h-screen bg-black relative">
      <GestureController
        onGestureMove={(data) => console.log('Move:', data.normalizedPosition)}
        onGestureDown={() => console.log('Down')}
        onGestureUp={() => console.log('Up')}
        onGestureLeave={() => console.log('Leave')}
        resetOnLeave={false}
      >
        <Canvas
          camera={{ position: [0, 0, 2], fov: 75 }}
          gl={{ 
            antialias: false, 
            alpha: false,
            powerPreference: 'high-performance'
          }}
        >
          <Scene />
        </Canvas>
      </GestureController>
    </div>
  )
}