import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router'

const validSectionHashes = new Set(['#gastos', '#ingresos'])

export function useFinancialSectionHash(ready = true) {
  const { hash, pathname } = useLocation()

  useLayoutEffect(() => {
    if (!ready || !validSectionHashes.has(hash)) {
      return
    }

    let frameId = 0
    let frameCount = 0
    let stableFrames = 0
    let previousDocumentHeight = -1
    let isCancelled = false

    function scrollWhenReady() {
      if (isCancelled) return

      frameCount += 1
      const target = document.getElementById(hash.slice(1))
      const documentHeight = document.documentElement.scrollHeight
      stableFrames = documentHeight === previousDocumentHeight ? stableFrames + 1 : 0
      previousDocumentHeight = documentHeight

      const layoutIsSettled = frameCount >= 18 && stableFrames >= 8
      const retryLimitReached = frameCount >= 60

      if ((!target && !retryLimitReached) || (target && !layoutIsSettled && !retryLimitReached)) {
        frameId = window.requestAnimationFrame(scrollWhenReady)
        return
      }

      if (!target) return

      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    }

    frameId = window.requestAnimationFrame(scrollWhenReady)

    return () => {
      isCancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [hash, pathname, ready])
}
