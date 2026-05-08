import { BarChart3 } from 'lucide-react'

type UsageChartProps = {
  hourlyUse: number[]
}

export function UsageChart({ hourlyUse }: UsageChartProps) {
  return (
    <section className="panel-card chart-panel" id="reportes">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Reportes</span>
          <h2>Consumo por hora</h2>
        </div>
        <BarChart3 size={22} />
      </div>
      <div className="usage-chart" aria-label="Grafico de consumo por hora">
        {hourlyUse.map((value, index) => (
          <div className="usage-bar" key={`hour-${index}`}>
            <span style={{ height: `${value}%` }}></span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
      </div>
    </section>
  )
}
