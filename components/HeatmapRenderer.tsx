'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
precision highp float;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
precision highp float;

uniform float uDraw;
uniform vec3 uRadius;
uniform vec3 uResolution;
uniform vec2 uPosition;
uniform vec4 uDirection;
uniform float uSizeDamping;
uniform float uFadeDamping;
uniform sampler2D uTexture;

varying vec2 vUv;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 pos = uPosition;
  pos.y /= aspect;

  vec2 uv = vUv;
  uv.y /= aspect;
  
  float dist = distance(pos, uv) / (uRadius.z / uResolution.x);
  dist = smoothstep(uRadius.x, uRadius.y, dist);
  
  vec3 dir = uDirection.xyz * uDirection.w;
  vec2 offset = vec2((-dir.x) * (1.0-dist), (dir.y) * (1.0-dist));

  vec2 uvt = vUv;
  vec4 color = texture(uTexture, uvt + (offset * 0.01));

  color *= uFadeDamping;
 
  color.r += offset.x;
  color.g += offset.y;
  color.rg = clamp(color.rg, -1.0, 1.0);

  float d = uDraw;
  color.b += d * (1.0-dist);

  gl_FragColor = vec4(color.rgb, 1.0);
}
`

interface HeatmapRendererProps {
  resolution: [number, number]
  position: [number, number]
  direction: [number, number, number, number]
  drawAmount: number
  radiusRatio?: number
  isMobile?: boolean
}

export function HeatmapRenderer({ 
  resolution, 
  position, 
  direction, 
  drawAmount,
  radiusRatio = 1000,
  isMobile = false
}: HeatmapRendererProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { gl } = useThree()
  
  const [renderTargetA, renderTargetB] = useMemo(() => {
    const rtA = new THREE.WebGLRenderTarget(resolution[0], resolution[1], {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    })
    const rtB = new THREE.WebGLRenderTarget(resolution[0], resolution[1], {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    })
    return [rtA, rtB]
  }, [resolution])

  const material = useMemo(() => {
    const height = resolution[1]
    const radiusSize = (isMobile ? 350 : 220) * (height / radiusRatio)
    
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: renderTargetB.texture },
        uResolution: { value: [resolution[0], resolution[1], 1] },
        uPosition: { value: [0.5, 0.5] },
        uDirection: { value: [0, 0, 0, 100] },
        uRadius: { value: [0, 0.5, radiusSize] },
        uSizeDamping: { value: 1 },
        uFadeDamping: { value: 0.95 },
        uDraw: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      transparent: true,
    })
  }, [resolution, isMobile, radiusRatio, renderTargetB])

  useEffect(() => {
    if (material) {
      material.uniforms.uPosition.value = position
      material.uniforms.uDirection.value = direction
      material.uniforms.uDraw.value = drawAmount
      material.uniforms.uResolution.value = [resolution[0], resolution[1], 1]
    }
  }, [material, position, direction, drawAmount, resolution])

  useFrame(() => {
    if (!meshRef.current || !material) return
    
    // Ping-pong between render targets for feedback effect
    const currentTarget = renderTargetA
    const previousTarget = renderTargetB
    
    material.uniforms.uTexture.value = previousTarget.texture
    
    const originalRenderTarget = gl.getRenderTarget()
    gl.setRenderTarget(currentTarget)
    gl.clear()
    
    // Render would happen here in the full scene context
    
    gl.setRenderTarget(originalRenderTarget)
    
    // Swap render targets
    ;[renderTargetA, renderTargetB] = [renderTargetB, renderTargetA]
  })

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} />
    </mesh>
  )
}