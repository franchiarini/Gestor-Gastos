import { useEffect } from 'react'
import { useLocation } from 'react-router'

const validSectionHashes = new Set(['#gastos', '#ingresos'])

export function useFinancialSectionHash() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (!validSectionHashes.has(hash)) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [hash, pathname])
}
