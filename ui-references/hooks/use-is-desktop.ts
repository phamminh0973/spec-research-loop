"use client"

import { useEffect, useState } from "react"

/**
 * Returns whether the viewport currently matches a desktop breakpoint.
 * Starts as `undefined` until the media query resolves on the client, so
 * callers can avoid rendering mobile-only UI (e.g. a Sheet) before we
 * actually know the viewport — preventing a flash on desktop loads.
 */
export function useIsDesktop(breakpointPx = 1024) {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${breakpointPx}px)`)
    const onChange = () => setIsDesktop(mediaQuery.matches)
    onChange()
    mediaQuery.addEventListener("change", onChange)
    return () => mediaQuery.removeEventListener("change", onChange)
  }, [breakpointPx])

  return isDesktop
}
