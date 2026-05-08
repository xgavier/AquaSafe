import type { AddTankStatus } from '../../types/aquasafe'

type FormStatusMessageProps = {
  status: AddTankStatus
}

export function FormStatusMessage({ status }: FormStatusMessageProps) {
  if (!status.message) {
    return null
  }

  return <span className={`form-message ${status.type}`}>{status.message}</span>
}
