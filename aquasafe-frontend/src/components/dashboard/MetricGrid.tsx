import { Activity } from 'lucide-react'
import { metricIcons } from '../../data/dashboardData'
import type { DashboardMetric } from '../../types/aquasafe'

type MetricGridProps = {
  metrics: DashboardMetric[]
}

export function MetricGrid({ metrics }: MetricGridProps) {
  return (
    <section className="metric-grid" aria-label="Metricas principales">
      {metrics.map((metric) => {
        const Icon = metricIcons[metric.key] ?? Activity
        return (
          <article className={`metric-card metric-${metric.tone}`} key={metric.key}>
            <div className="metric-head">
              <div>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
              <Icon size={26} />
            </div>
            <div className="spark-bars" aria-hidden="true">
              {metric.bars.map((bar, index) => (
                <span key={`${metric.key}-${index}`} style={{ height: `${bar}%` }} />
              ))}
            </div>
            <small>{metric.trend}</small>
          </article>
        )
      })}
    </section>
  )
}
