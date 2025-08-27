'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree, useLoader, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'

// Apple's exact shader implementation
const heatVertexShader = `
varying vec2 vUv;
varying vec4 vClipPosition;

void main() {
  vUv = uv;
  vClipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vClipPosition;
}
`

const heatFragmentShader = `
precision highp isampler2D;
precision highp usampler2D;

uniform sampler2D drawMap;
uniform sampler2D textureMap;
uniform sampler2D maskMap;

uniform float blendVideo;
uniform float amount;
uniform float opacity;
uniform vec2 scale;
uniform vec2 offset;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;
uniform vec3 color6;
uniform vec3 color7;
uniform vec4 blend;
uniform vec4 fade;
uniform vec4 maxBlend;

uniform float power;
uniform float rnd;
uniform vec4 heat;
uniform vec4 stretch;

varying vec2 vUv;
varying vec4 vClipPosition;

float adjustLevels(float value, float inBlack, float inWhite, float outBlack, float outWhite, float gamma) {
  float t = clamp((value - inBlack) / max(inWhite - inBlack, 1e-5), 0.0, 1.0);
  t = pow(t, gamma);
  return mix(outBlack, outWhite, t);
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 linearRgbToLuminance(vec3 linearRgb){
  float finalColor = dot(linearRgb, vec3(0.2126729, 0.7151522, 0.0721750));
  return vec3(finalColor);
}

vec3 saturation(vec3 color, float saturation){
  return mix(linearRgbToLuminance(color), color, saturation);
}

vec3 gradient(float t) {
  float p1 = blend.x;
  float p2 = blend.y;
  float p3 = blend.z;
  float p4 = blend.w;
  float p5 = maxBlend.x;
  float p6 = maxBlend.y;

  float f1 = fade.x;
  float f2 = fade.y;
  float f3 = fade.z;
  float f4 = fade.w;
  float f5 = maxBlend.z;
  float f6 = maxBlend.w;

  float blend1 = smoothstep(p1 - f1 * 0.5, p1 + f1 * 0.5, t);
  float blend2 = smoothstep(p2 - f2 * 0.5, p2 + f2 * 0.5, t);
  float blend3 = smoothstep(p3 - f3 * 0.5, p3 + f3 * 0.5, t);
  float blend4 = smoothstep(p4 - f4 * 0.5, p4 + f4 * 0.5, t);
  float blend5 = smoothstep(p5 - f5 * 0.5, p5 + f5 * 0.5, t);
  float blend6 = smoothstep(p6 - f6 * 0.5, p6 + f6 * 0.5, t);

  vec3 color = color1;
  color = mix(color, color2, blend1);
  color = mix(color, color3, blend2);
  color = mix(color, color4, blend3);
  color = mix(color, color5, blend4);
  color = mix(color, color6, blend5);
  color = mix(color, color7, blend6);

  return color;
}

void main() {
  vec2 duv = vClipPosition.xy/vClipPosition.w;
  duv = 0.5 + duv * 0.5;

  vec2 uv = vUv;
  uv -= 0.5;
  uv /= scale;
  uv += 0.5;
  uv += offset;

  float o = clamp(opacity, 0.0, 1.0);
  float a = clamp(amount, 0.0, 1.0);
  float v = o * a;

  vec4 tex = texture2D(maskMap, uv + offset);
  float mask = tex.g;
  float logo = smoothstep(0.58, 0.6, 1.0-tex.b);

  vec2 wuv = uv;
  vec3 draw = texture2D(drawMap, duv).rgb;
  float heatDraw = draw.b;
  heatDraw *= mix(0.1, 1.0, mask);

  vec2 offset2 = draw.rg * 0.01;
  vec3 video = textureLod(textureMap, wuv + offset2, 0.0).rgb;

  float h = mix(pow(1.0-video.r, 1.5), 1.0, 0.2) * 1.25;
  heatDraw *= h;

  float map = video.r;
  map = pow(map, power);
  float msk = smoothstep(0.2, 0.5, uv.y);
  map = mix( map * 0.91, map, msk); 
  map = mix(0.0, map, v);
  
  float fade2 = distance(vUv, vec2(0.5, 0.52));
  fade2 = smoothstep(0.5, 0.62, 1.0-fade2);
  
  vec3 finalColor = gradient(map + heatDraw);
  finalColor = saturation(finalColor, 1.3);
  
  finalColor *= fade2;
  finalColor = mix(vec3(0.0), finalColor, a);

  gl_FragColor = vec4(finalColor, logo * opacity);
}
`

// Draw renderer - Apple's Ua class shader
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

function DrawRenderer({ 
  size = 256,
  position,
  direction,
  drawAmount,
  onTextureUpdate 
}: {
  size?: number
  position: [number, number]
  direction: [number, number, number, number]
  drawAmount: number
  onTextureUpdate: (texture: THREE.Texture) => void
}) {
  const { gl } = useThree()
  
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
        uRadius: { value: [-8, 0.9, 150] }, // Apple's exact values
        uPosition: { value: [0, 0] },
        uDirection: { value: [0, 0, 0, 0] },
        uResolution: { value: [size, size, 0] },
        uTexture: { value: renderTargets.previous.texture },
        uSizeDamping: { value: 0.8 },
        uFadeDamping: { value: 0.98 }, // Apple's exact fade rate
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
  }, [size, renderTargets])

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

function AppleHeatMesh({
  drawTexture,
  mouse,
  heatAmount,
  onPointerMove,
  onPointerDown,
  onPointerUp
}: {
  drawTexture: THREE.Texture | null
  mouse: [number, number]
  heatAmount: number
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const timeRef = useRef(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null)

  // Load Apple logo exactly like they do
  const maskTexture = useLoader(THREE.TextureLoader, '/logo__dcojfwkzna2q.png')
  
  // Setup video texture like Apple's implementation
  useEffect(() => {
    const video = document.createElement('video')
    video.src = '/large_2x.mp4'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.autoplay = true
    
    // Apple sets video to preload and configure
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    
    const onVideoLoad = () => {
      const texture = new THREE.VideoTexture(video)
      texture.minFilter = THREE.LinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.format = THREE.RGBFormat
      texture.flipY = false
      // Apple's exact texture wrapping like getBlurTexture()
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      setVideoTexture(texture)
    }
    
    video.addEventListener('loadeddata', onVideoLoad)
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
      video.removeEventListener('loadeddata', onVideoLoad)
      video.pause()
      video.src = ''
    }
  }, [])
  
  useEffect(() => {
    if (maskTexture) {
      maskTexture.wrapS = maskTexture.wrapT = THREE.RepeatWrapping
      maskTexture.needsUpdate = true
    }
  }, [maskTexture])

  // Apple's exact Fa and Ba configuration values  
  const material = useMemo(() => {
    const Fa = ["000000", "073dff", "53d5fd", "fefcdd", "ffec6a", "f9d400", "a61904"]
    
    // Convert hex colors to RGB arrays
    const hexToRGB = (hex: string): [number, number, number] => {
      const r = parseInt(hex.substr(0, 2), 16) / 255
      const g = parseInt(hex.substr(2, 2), 16) / 255  
      const b = parseInt(hex.substr(4, 2), 16) / 255
      return [r, g, b]
    }

    const Ba = {
      power: 0.8,
      timeline: 0,
      Opacity: 1,
      "Scale X": 1,
      "Scale Y": 1,
      "UV X": 0,
      "UV Y": 0,
      "Color 1": hexToRGB(Fa[0]), // 000000 - Black
      "Color 2": hexToRGB(Fa[1]), // 073dff - Blue
      "Color 3": hexToRGB(Fa[2]), // 53d5fd - Light blue
      "Color 4": hexToRGB(Fa[3]), // fefcdd - Light yellow
      "Color 5": hexToRGB(Fa[4]), // ffec6a - Yellow
      "Color 6": hexToRGB(Fa[5]), // f9d400 - Gold
      "Color 7": hexToRGB(Fa[6]), // a61904 - Red
      Blend: [0.4, 0.7, 0.81, 0.91],
      Fade: [1, 1, 0.72, 0.52],
      Max: [0.8, 0.87, 0.5, 0.27],
      "Heat Inside Min": 0,
      "Heat Inside Max": 0,
      "Heat Outside Min": 0,
      "Heat Outside Max": 1.02,
      "X Min": 1,
      "X Max": 1,
      "Y Min": 0,
      "Y Max": 0,
    }

    return new THREE.ShaderMaterial({
      uniforms: {
        blendVideo: { value: 1.0 },
        drawMap: { value: drawTexture },
        textureMap: { value: videoTexture || maskTexture },
        maskMap: { value: maskTexture },
        scale: { value: [Ba["Scale X"], Ba["Scale Y"]] },
        offset: { value: [Ba["UV X"], Ba["UV Y"]] },
        opacity: { value: Ba.Opacity },
        amount: { value: 1.0 },
        color1: { value: Ba["Color 1"] },
        color2: { value: Ba["Color 2"] },
        color3: { value: Ba["Color 3"] },
        color4: { value: Ba["Color 4"] },
        color5: { value: Ba["Color 5"] },
        color6: { value: Ba["Color 6"] },
        color7: { value: Ba["Color 7"] },
        blend: { value: Ba.Blend },
        fade: { value: Ba.Fade },
        power: { value: Ba.power },
        rnd: { value: 0 },
        maxBlend: { value: Ba.Max },
        heat: { 
          value: [
            Ba["Heat Inside Min"],
            Ba["Heat Inside Max"], 
            Ba["Heat Outside Min"],
            Ba["Heat Outside Max"]
          ] 
        },
        stretch: { 
          value: [Ba["X Min"], Ba["X Max"], Ba["Y Min"], Ba["Y Max"]] 
        },
      },
      vertexShader: heatVertexShader,
      fragmentShader: heatFragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    })
  }, [maskTexture, drawTexture, videoTexture])

  useFrame((state, delta) => {
    timeRef.current += delta
    if (material) {
      material.uniforms.rnd.value = Math.random()
      material.uniforms.amount.value = 1.0
    }
  })

  return (
    <mesh 
      ref={meshRef} 
      position={[0, 0, 0]}
      scale={[1, 1, 1]}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <planeGeometry args={[1, 1]} />
      <primitive object={material} />
    </mesh>
  )
}

function Scene() {
  const [mouse, setMouse] = useState<[number, number]>([0, 0])
  const [isHolding, setIsHolding] = useState(false)
  const [heatAmount, setHeatAmount] = useState(0)
  const [drawTexture, setDrawTexture] = useState<THREE.Texture | null>(null)
  const heatRef = useRef(0)
  const { camera, size } = useThree()

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

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    // Apple's exact coordinate system: 2 * (normalizedPosition - 0.5)
    // e.uv gives us normalized UV coordinates [0,1], convert to Apple's [-1,1] system
    const x = 2 * (e.uv.x - 0.5)
    const y = 2 * -(e.uv.y - 0.5)  // Apple inverts Y
    
    setMouse([x, y])
    
    if (isHolding) {
      heatRef.current += 0.5 * 0.016 * 60  // Apple's exact heat buildup: 0.5 * deltaTime * 60
      setHeatAmount(Math.min(1.3, heatRef.current))
    }
  }, [isHolding])

  const handlePointerDown = useCallback(() => {
    setIsHolding(true)
  }, [])

  const handlePointerUp = useCallback(() => {
    setIsHolding(false)
  }, [])

  useFrame(() => {
    if (!isHolding && heatRef.current > 0) {
      heatRef.current *= 0.95 // Apple's exact decay rate
      heatRef.current = heatRef.current < 0.001 ? 0 : heatRef.current // Apple's cutoff
      setHeatAmount(heatRef.current)
    }
  })

  // Direction calculation from mouse delta (simplified)
  const direction = useMemo<[number, number, number, number]>(() => {
    return [0, 0, 0, 100] // This would be calculated from mouse movement in Apple's code
  }, [])

  return (
    <>
      <DrawRenderer
        size={256}
        position={mouse}
        direction={direction}
        drawAmount={heatAmount}
        onTextureUpdate={setDrawTexture}
      />
      <AppleHeatMesh
        drawTexture={drawTexture}
        mouse={mouse}
        heatAmount={heatAmount}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
    </>
  )
}

export function AppleExactHeatmap() {
  return (
    <div className="w-full h-screen bg-black relative flex items-center justify-center">
      <div className="absolute top-4 left-4 text-white text-sm font-mono z-10">
        <div>Apple Exact Implementation</div>
        <div>Hold and drag for heat effect</div>
      </div>

      {/* Square canvas like Apple's implementation */}
      <div className="w-[80vmin] h-[80vmin]">
        <Canvas
          orthographic
          camera={{ 
            position: [0, 0, 1], 
            left: -2, 
            right: 2, 
            top: 2, 
            bottom: -2, 
            near: -1, 
            far: 1
          }}
          gl={{ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance'
          }}
        >
          <Scene />
        </Canvas>
      </div>
    </div>
  )
}