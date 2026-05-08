import { X } from 'lucide-react'
import type { AlertItem } from '../../types/aquasafe'
import { AlertList } from './AlertList'

type NotificationMenuProps = {
  alerts: AlertItem[]
  onClose: () => void
}

export function NotificationMenu({ alerts, onClose }: NotificationMenuProps) {
  return (
    <div className="notification-menu" role="dialog" aria-label="Todas las alertas">
      <div className="notification-menu-header">
        <div>
          <span className="eyebrow">Notificaciones</span>
          <h2>Todas las alertas</h2>
        </div>
        <button
          className="icon-button notification-close"
          type="button"
          aria-label="Cerrar notificaciones"
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </div>

      <div className="notification-list">
        <AlertList alerts={alerts} emptyMessage="Sin alertas generadas." />
      </div>
    </div>
  )
}
