"use client"

import drawFragmentShader from "@/shaders/draw.frag"
import drawVertexShader from "@/shaders/draw.vert"
import { useFrame, useThree } from "@react-three/fiber"
import { useFBO } from "@react-three/drei"
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
} from "three"

const fboParams = {
  type: FloatType,
  format: RGBAFormat,
  minFilter: LinearFilter,
  magFilter: LinearFilter,
}


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
  const { size: canvasSize } = useThree()

  // Apple's exact radius - use controllable value
  const dynamicRadius = radiusSize

  const fboA = useFBO(size, size, fboParams)
  const fboB = useFBO(size, size, fboParams)
  
  const renderTargets = useMemo(() => ({ 
    current: fboA, 
    previous: fboB 
  }), [fboA, fboB])

  const { drawScene, drawCamera, material } = useMemo(() => {
    const drawScene = new Scene()
    const drawCamera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10)
    drawCamera.position.z = 1

    const material = new ShaderMaterial({
      uniforms: {
        uRadius: { value: [-8, 0.9, dynamicRadius] },
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
    drawScene.add(mesh)

    return { drawScene, drawCamera, material }
  }, [renderTargets, dynamicRadius, sizeDamping, fadeDamping, canvasSize])

  // Update uniforms
  useEffect(() => {
    material.uniforms.uRadius.value[2] = dynamicRadius
  }, [material, dynamicRadius])

  useEffect(() => {
    material.uniforms.uPosition.value = position
    material.uniforms.uDirection.value = direction
    material.uniforms.uDraw.value = drawAmount
  }, [material, position, direction, drawAmount])

  useFrame(({ gl }) => {
    const currentTarget = renderTargets.current
    const previousTarget = renderTargets.previous

    material.uniforms.uTexture.value = previousTarget.texture

    const originalTarget = gl.getRenderTarget()
    gl.setRenderTarget(currentTarget)
    gl.clear()
    gl.render(drawScene, drawCamera)
    gl.setRenderTarget(originalTarget)

    const temp = renderTargets.current
    renderTargets.current = renderTargets.previous
    renderTargets.previous = temp

    onTextureUpdate(currentTarget.texture)
  })

  return null
}
