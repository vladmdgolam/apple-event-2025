"use client"

import drawFragmentShader from "@/shaders/draw.frag"
import drawVertexShader from "@/shaders/draw.vert"
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import {
  FloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderTarget,
  type RenderTargetOptions,
} from "three"

const renderTargetParams = {
  type: FloatType,
  format: RGBAFormat,
  internalFormat: "RGBA16F" as const, // Apple's exact internal format
  minFilter: LinearFilter,
  magFilter: LinearFilter,
  generateMipmaps: true,
  depthBuffer: false,
  stencilBuffer: false,
} as RenderTargetOptions

export const DrawRenderer = ({
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
  onTextureUpdate: (texture: Texture) => void
  sizeDamping: number
  fadeDamping: number
  radiusSize: number
}) => {
  const { gl, size: canvasSize } = useThree()

  // Apple's exact radius - use controllable value
  const dynamicRadius = radiusSize

  const renderTargets = useMemo(() => {
    const rtA = new WebGLRenderTarget(size, size, renderTargetParams)
    const rtB = new WebGLRenderTarget(size, size, renderTargetParams)
    return { current: rtA, previous: rtB }
  }, [size, renderTargetParams])

  const { scene, camera, material } = useMemo(() => {
    // Apple's exact draw renderer setup
    const scene = new Scene()
    const camera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10)
    camera.position.z = 1

    const material = new ShaderMaterial({
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

    const mesh = new Mesh(new PlaneGeometry(1, 1), material)
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
