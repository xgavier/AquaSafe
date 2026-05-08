import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { AlertItem } from '../../types/aquasafe'

type AlertRowProps = {
  alert: AlertItem
}

export function AlertRow({ alert }: AlertRowProps) {
  return (
    <article className={`alert-row alert-${alert.severity}`}>
      <div className="alert-icon">
        {alert.severity === 'ok' ? (
          <CheckCircle2 size={18} />
        ) : (
          <AlertTriangle size={18} />
        )}
      </div>
      <div>
        <h3>{alert.title}</h3>
        <p>{alert.detail}</p>
        <span>{alert.time}</span>
      </div>
    </article>
  )
}
