import { RotateCcw, Smartphone } from 'lucide-react'

const PortraitGuard = () => (
  <div className="lumi-portrait-guard" role="status" aria-live="polite">
    <div className="lumi-portrait-guard-card">
      <div className="lumi-portrait-guard-icon">
        <Smartphone className="h-12 w-12" />
        <RotateCcw className="h-6 w-6" />
      </div>
      <h1>Поверните телефон вертикально</h1>
      <p>LumiCRM зафиксирован в портретном режиме для удобной работы.</p>
    </div>
  </div>
)

export default PortraitGuard
