import { AlertTriangle } from 'lucide-react'
import type { AlertItem } from '../../types/aquasafe'
import { AlertList } from '../alerts/AlertList'

type AlertsPanelProps = {
  alerts: AlertItem[]
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <section className="panel-card" id="alertas">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Alertas</span>
          <h2>Eventos recientes</h2>
        </div>
        <AlertTriangle size={22} />
      </div>
      <div className="alert-list">
        <AlertList alerts={alerts} emptyMessage="Sin alertas recientes." />
      </div>
    </section>
  )
}
