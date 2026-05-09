import { Gauge } from 'lucide-react'
import type { ApiStatus, DashboardData } from '../../types/aquasafe'

type OverviewBandProps = {
  apiStatus: ApiStatus
  overview: DashboardData['overview']
}

export function OverviewBand({ apiStatus, overview }: OverviewBandProps) {
  return (
    <section className="overview-band" id="dashboard">
      <div>
        <span className="eyebrow">Estado general</span>
        <h2>Operacion hidrica bajo control</h2>
        <p>
          {apiStatus === 'online'
            ? 'Lecturas para presentar nivel, temperatura, consumo y riesgo.'
            : 'Mostrando datos locales mientras se establece conexion con la API de AquaSafe.'}
        </p>
      </div>
      <div className="overview-score">
        <Gauge size={26} />
        <div>
          <strong>{overview.healthScore}%</strong>
          <span>Indice de salud</span>
        </div>
      </div>
    </section>
  )
}
