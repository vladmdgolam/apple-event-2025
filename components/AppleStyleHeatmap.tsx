'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader, extend, Object3DNode } from '@react-three/fiber'
import * as THREE from 'three'
import { GestureController } from './GestureController'

// Draw renderer shader (like Apple's Ua class)
const drawVertexShader = `
precision highp float;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const drawFragmentShader = `
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
  vec4 color = texture2D(uTexture, uvt + (offset * 0.01));

  color *= uFadeDamping;
 
  color.r += offset.x;
  color.g += offset.y;
  color.rg = clamp(color.rg, -1.0, 1.0);

  float d = uDraw;
  color.b += d * (1.0-dist);

  gl_FragColor = vec4(color.rgb, 1.0);
}
`

// Heat effect shader (like Apple's heat material)
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
uniform float uAmount;
uniform float uBlendVideo;
uniform float uOpacity;
uniform float uPower;
uniform float uRnd;
uniform vec2 uScale;
uniform vec2 uOffset;
uniform vec4 uHeat;
uniform vec4 uStretch;
uniform sampler2D uMaskTexture;
uniform sampler2D uDrawTexture;

varying vec2 vUv;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  
  // Apply scale and offset transformations
  vec2 scaledUv = (uv - 0.5) * uScale + 0.5 + uOffset;
  
  // Sample the Apple logo mask
  vec4 maskColor = texture2D(uMaskTexture, scaledUv);
  float mask = maskColor.a;
  
  if (mask < 0.1) {
    discard;
  }
  
  // Sample draw texture (heat trails)
  vec4 drawColor = texture2D(uDrawTexture, uv);
  float heatIntensity = drawColor.b; // Blue channel contains heat
  
  // Apply heat range mapping like Apple
  float heatValue = mix(uHeat.x, uHeat.y, heatIntensity); // Inside min/max
  float outsideHeat = mix(uHeat.z, uHeat.w, heatIntensity); // Outside min/max
  
  // Create heat color gradient
  vec3 baseColor = vec3(1.0, 1.0, 1.0); // White logo
  vec3 warmColor = vec3(1.0, 0.8, 0.4); // Warm yellow
  vec3 hotColor = vec3(1.0, 0.4, 0.1);  // Hot orange/red
  
  // Multi-stage heat coloring
  vec3 finalColor = baseColor;
  if (heatValue > 0.1) {
    finalColor = mix(baseColor, warmColor, smoothstep(0.1, 0.5, heatValue));
  }
  if (heatValue > 0.5) {
    finalColor = mix(finalColor, hotColor, smoothstep(0.5, 1.0, heatValue));
  }
  
  // Add organic noise with random seed
  float noise = random(uv + uRnd) * 0.1;
  finalColor += noise * heatValue * 0.3;
  
  // Apply stretch effect
  vec2 stretchedUv = uv;
  stretchedUv.x = mix(uStretch.x, uStretch.y, uv.x);
  stretchedUv.y = mix(uStretch.z, uStretch.w, uv.y);
  
  // Final composition with power curve
  float alpha = mask * uOpacity * pow(uAmount, uPower);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`

function DrawRenderer({ 
  resolution, 
  position, 
  direction, 
  drawAmount,
  onTextureUpdate 
}: {
  resolution: [number, number]
  position: [number, number]
  direction: [number, number, number, number]
  drawAmount: number
  onTextureUpdate: (texture: THREE.Texture) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const sceneRef = useRef<THREE.Scene>(null)
  const cameraRef = useRef<THREE.OrthographicCamera>(null)
  const { gl } = useThree()
  
  const [renderTargetA, renderTargetB] = useMemo(() => {
    const rtA = new THREE.WebGLRenderTarget(256, 256, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    })
    const rtB = new THREE.WebGLRenderTarget(256, 256, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    })
    return [rtA, rtB]
  }, [])

  const material = useMemo(() => {
    const radiusSize = 220 * (resolution[1] / 1000) // Similar to Apple's calculation
    
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: renderTargetB.texture },
        uResolution: { value: [256, 256, 1] },
        uPosition: { value: [0.5, 0.5] },
        uDirection: { value: [0, 0, 0, 100] },
        uRadius: { value: [0, 0.5, radiusSize] },
        uSizeDamping: { value: 1 },
        uFadeDamping: { value: 0.95 }, // Apple's fade rate
        uDraw: { value: 0 },
      },
      vertexShader: drawVertexShader,
      fragmentShader: drawFragmentShader,
      depthTest: false,
      transparent: true,
    })
  }, [resolution, renderTargetB])

  const scene = useMemo(() => {
    const s = new THREE.Scene()
    const c = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1)
    return { scene: s, camera: c }
  }, [])

  useEffect(() => {
    if (material) {
      material.uniforms.uPosition.value = position
      material.uniforms.uDirection.value = direction
      material.uniforms.uDraw.value = drawAmount
    }
  }, [material, position, direction, drawAmount])

  useFrame(() => {
    if (!meshRef.current || !material) return
    
    // Ping-pong rendering like Apple's implementation
    const currentTarget = renderTargetA
    const previousTarget = renderTargetB
    
    material.uniforms.uTexture.value = previousTarget.texture
    
    // Set up scene for offscreen rendering
    if (!sceneRef.current) {
      sceneRef.current = new THREE.Scene()
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
      sceneRef.current.add(mesh)
      
      cameraRef.current = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1)
    }
    
    const originalTarget = gl.getRenderTarget()
    gl.setRenderTarget(currentTarget)
    if (!gl.autoClear) gl.clear()
    
    if (sceneRef.current && cameraRef.current) {
      gl.render(sceneRef.current, cameraRef.current)
    }
    
    gl.setRenderTarget(originalTarget)
    
    // Swap render targets
    ;[renderTargetA, renderTargetB] = [renderTargetB, renderTargetA]
    
    // Notify parent of texture update
    onTextureUpdate(currentTarget.texture)
  })

  return null // This component handles offscreen rendering
}

function AppleHeatmapMesh({ drawTexture }: { drawTexture: THREE.Texture | null }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [heatAmount, setHeatAmount] = useState(1.0)
  const [blendVideo, setBlendVideo] = useState(1.0)
  const timeRef = useRef(0)

  // Load the Apple logo mask
  const maskTexture = useLoader(THREE.TextureLoader, '/logo__dcojfwkzna2q.png')

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmount: { value: 1 },
        uBlendVideo: { value: 1 },
        uOpacity: { value: 0.8 },
        uPower: { value: 1.0 },
        uRnd: { value: Math.random() },
        uScale: { value: [1.0, 1.0] },
        uOffset: { value: [0.0, 0.0] },
        uHeat: { value: [0.1, 0.3, 0.05, 0.2] }, // Heat inside min, inside max, outside min, outside max
        uStretch: { value: [0.0, 1.0, 0.0, 1.0] }, // X min, X max, Y min, Y max
        uMaskTexture: { value: maskTexture },
        uDrawTexture: { value: drawTexture || maskTexture }
      },
      vertexShader: heatVertexShader,
      fragmentShader: heatFragmentShader,
      transparent: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide
    })
  }, [maskTexture, drawTexture])

  useFrame((state, delta) => {
    timeRef.current += delta
    
    if (material) {
      material.uniforms.uTime.value = timeRef.current
      material.uniforms.uAmount.value = heatAmount
      material.uniforms.uBlendVideo.value = blendVideo
      material.uniforms.uRnd.value = Math.random() // Apple updates random each frame
    }
  })

  // Expose methods to update heat like Apple's implementation
  useEffect(() => {
    const updateHeat = () => {
      setHeatAmount(1.0) // Can be controlled externally
      setBlendVideo(1.0)
    }
    updateHeat()
  }, [])

  return (
    <mesh ref={meshRef} scale={[4, 4, 1]}>
      <planeGeometry args={[1, 1, 64, 64]} />
      <primitive object={material} />
    </mesh>
  )
}

function Scene() {
  const [mouse, setMouse] = useState<[number, number]>([0, 0])
  const [isHolding, setIsHolding] = useState(false)
  const [heatAmount, setHeatAmount] = useState(0)
  const [drawTexture, setDrawTexture] = useState<THREE.Texture | null>(null)
  const heatAccumulator = useRef(0)
  const { camera } = useThree()

  const handleGestureMove = useCallback((data: any) => {
    const normalizedX = data.normalizedPosition.x
    const normalizedY = data.normalizedPosition.y
    
    setMouse([normalizedX, normalizedY])
    
    if (isHolding) {
      heatAccumulator.current += 0.05 // Heat buildup rate
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
    if (!isHolding && heatAmount > 0) {
      heatAccumulator.current *= 0.95 // Apple's decay rate
      setHeatAmount(heatAccumulator.current)
    }
  })

  // Convert normalized direction for shader
  const direction = useMemo<[number, number, number, number]>(() => {
    // Apple converts mouse delta to direction vector
    return [0, 0, 0, 100] // This would be calculated from mouse movement
  }, [mouse])

  useEffect(() => {
    if (camera) {
      camera.position.set(0, 0, 2)
    }
  }, [camera])

  return (
    <>
      <DrawRenderer
        resolution={[512, 512]}
        position={mouse}
        direction={direction}
        drawAmount={heatAmount}
        onTextureUpdate={setDrawTexture}
      />
      <AppleHeatmapMesh drawTexture={drawTexture} />
    </>
  )
}

export function AppleStyleHeatmap() {
  return (
    <div className="w-full h-screen bg-black relative flex items-center justify-center">
      <div className="absolute top-4 left-4 text-white text-sm font-mono z-10">
        <div>Apple-style Heatmap Effect</div>
        <div>Hold and drag to create heat trails</div>
      </div>

      <GestureController
        onGestureMove={() => {}}
        onGestureDown={() => {}}
        onGestureUp={() => {}}
        onGestureLeave={() => {}}
        resetOnLeave={false}
      >
        <div className="w-96 h-96">
          <Canvas
            camera={{ 
              position: [0, 0, 2], 
              fov: 50,
              near: 0.1,
              far: 1000
            }}
            gl={{ 
              antialias: false, 
              alpha: true,
              powerPreference: 'high-performance'
            }}
          >
            <Scene />
          </Canvas>
        </div>
      </GestureController>
    </div>
  )
}