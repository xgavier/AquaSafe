import type { AlertItem } from '../../types/aquasafe'
import { getAlertMarker } from '../../utils/alerts'
import { AlertRow } from './AlertRow'

type AlertListProps = {
  alerts: AlertItem[]
  emptyMessage: string
}

export function AlertList({ alerts, emptyMessage }: AlertListProps) {
  if (!alerts.length) {
    return <p className="empty-alerts">{emptyMessage}</p>
  }

  return (
    <>
      {alerts.map((alert) => (
        <AlertRow alert={alert} key={getAlertMarker(alert)} />
      ))}
    </>
  )
}
