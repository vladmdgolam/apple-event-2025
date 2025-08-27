'use client'

import { useRef, useCallback, useEffect } from 'react'

interface HoverData {
  worldPosition: { x: number; y: number }
  localPosition: { x: number; y: number }
  normalizedPosition: { x: number; y: number }
  delta: { x: number; y: number }
  normalizedDelta: { x: number; y: number }
  speed: number
}

interface GestureControllerProps {
  onGestureMove?: (data: HoverData) => void
  onGestureEnter?: (data: HoverData) => void
  onGestureLeave?: (data: HoverData) => void
  onGestureDown?: (data: HoverData) => void
  onGestureUp?: (data: HoverData) => void
  resetOnLeave?: boolean
  children: React.ReactNode
}

export function GestureController({
  onGestureMove,
  onGestureEnter,
  onGestureLeave,
  onGestureDown,
  onGestureUp,
  resetOnLeave = false,
  children
}: GestureControllerProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const lastTimeRef = useRef(0)
  const hoverDataRef = useRef<HoverData>({
    worldPosition: { x: 0, y: 0 },
    localPosition: { x: 0, y: 0 },
    normalizedPosition: { x: 0.5, y: 0.5 },
    delta: { x: 0, y: 0 },
    normalizedDelta: { x: 0, y: 0 },
    speed: 0
  })

  const updateHoverData = useCallback((clientX: number, clientY: number) => {
    const element = elementRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTimeRef.current

    const localX = clientX - rect.x
    const localY = clientY - rect.y
    const normalizedX = localX / rect.width
    const normalizedY = localY / rect.height

    const deltaX = clientX - lastPosRef.current.x
    const deltaY = clientY - lastPosRef.current.y
    const normalizedDeltaX = deltaX / rect.width
    const normalizedDeltaY = deltaY / rect.height

    const speed = deltaTime > 0 ? Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime : 0

    hoverDataRef.current = {
      worldPosition: { x: clientX, y: clientY },
      localPosition: { x: localX, y: localY },
      normalizedPosition: { x: normalizedX, y: normalizedY },
      delta: { x: deltaX, y: deltaY },
      normalizedDelta: { x: normalizedDeltaX, y: normalizedDeltaY },
      speed
    }

    onGestureMove?.(hoverDataRef.current)

    lastPosRef.current = { x: clientX, y: clientY }
    lastTimeRef.current = currentTime
  }, [onGestureMove])

  const resetHoverData = useCallback(() => {
    const element = elementRef.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const worldX = rect.x + centerX
    const worldY = rect.y + centerY

    hoverDataRef.current = {
      worldPosition: { x: worldX, y: worldY },
      localPosition: { x: centerX, y: centerY },
      normalizedPosition: { x: 0.5, y: 0.5 },
      delta: { x: 0, y: 0 },
      normalizedDelta: { x: 0, y: 0 },
      speed: 0
    }
  }, [])

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    lastPosRef.current = { x: e.clientX, y: e.clientY }
    lastTimeRef.current = performance.now()
    updateHoverData(e.clientX, e.clientY)
    onGestureEnter?.(hoverDataRef.current)
  }, [updateHoverData, onGestureEnter])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    updateHoverData(e.clientX, e.clientY)
  }, [updateHoverData])

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (resetOnLeave) {
      resetHoverData()
    }
    onGestureLeave?.(hoverDataRef.current)
  }, [resetOnLeave, resetHoverData, onGestureLeave])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    onGestureDown?.(hoverDataRef.current)
  }, [onGestureDown])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    onGestureUp?.(hoverDataRef.current)
  }, [onGestureUp])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      lastPosRef.current = { x: touch.clientX, y: touch.clientY }
      lastTimeRef.current = performance.now()
      updateHoverData(touch.clientX, touch.clientY)
      onGestureEnter?.(hoverDataRef.current)
      onGestureDown?.(hoverDataRef.current)
    }
  }, [updateHoverData, onGestureEnter, onGestureDown])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      updateHoverData(touch.clientX, touch.clientY)
    }
  }, [updateHoverData])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (resetOnLeave) {
      resetHoverData()
    }
    onGestureLeave?.(hoverDataRef.current)
    onGestureUp?.(hoverDataRef.current)
  }, [resetOnLeave, resetHoverData, onGestureLeave, onGestureUp])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mousemove', handleMouseMove)
    element.addEventListener('mouseleave', handleMouseLeave)
    element.addEventListener('mousedown', handleMouseDown)
    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchmove', handleTouchMove)
    element.addEventListener('touchend', handleTouchEnd)

    window.addEventListener('mouseup', handleMouseUp)

    resetHoverData()

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mousemove', handleMouseMove)
      element.removeEventListener('mouseleave', handleMouseLeave)
      element.removeEventListener('mousedown', handleMouseDown)
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetHoverData
  ])

  return (
    <div ref={elementRef} className="w-full h-full">
      {children}
    </div>
  )
}