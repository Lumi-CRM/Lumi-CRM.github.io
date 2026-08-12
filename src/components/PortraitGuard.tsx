import { useEffect, type ReactNode } from 'react'

const readOrientationAngle = () => {
  const modernAngle = screen.orientation?.angle
  const legacyAngle = (window as Window & { orientation?: number }).orientation
  return typeof modernAngle === 'number' ? modernAngle : typeof legacyAngle === 'number' ? legacyAngle : 90
}

const PortraitGuard = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    const updateDirection = () => {
      const angle = readOrientationAngle()
      document.documentElement.style.setProperty('--lumi-landscape-rotation', angle === 270 || angle === -90 ? '90deg' : '-90deg')
    }
    updateDirection()
    window.addEventListener('orientationchange', updateDirection)
    screen.orientation?.addEventListener?.('change', updateDirection)
    return () => {
      window.removeEventListener('orientationchange', updateDirection)
      screen.orientation?.removeEventListener?.('change', updateDirection)
    }
  }, [])

  return <div className="lumi-portrait-stage">{children}</div>
}

export default PortraitGuard
