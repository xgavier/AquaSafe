import type { AlertItem } from '../types/aquasafe'

export const getAlertMarker = (alert?: AlertItem) => {
  if (!alert) {
    return ''
  }

  return String(alert.id ?? `${alert.detectedAt ?? ''}-${alert.title}`)
}
