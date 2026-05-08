import { Bell, Menu, UserCircle, X } from 'lucide-react'
import type { AlertItem, NavItem } from '../../types/aquasafe'
import { NotificationMenu } from '../alerts/NotificationMenu'

type TopbarProps = {
  alerts: AlertItem[]
  currentSection: NavItem
  hasUnreadAlerts: boolean
  notificationsOpen: boolean
  sidebarOpen: boolean
  onCloseNotifications: () => void
  onToggleNotifications: () => void
  onToggleSidebar: () => void
}

export function Topbar({
  alerts,
  currentSection,
  hasUnreadAlerts,
  notificationsOpen,
  sidebarOpen,
  onCloseNotifications,
  onToggleNotifications,
  onToggleSidebar,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <button
          aria-label={sidebarOpen ? 'Cerrar menu' : 'Abrir menu'}
          className="icon-button mobile-menu"
          type="button"
          onClick={onToggleSidebar}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div>
          <span className="eyebrow">Panel de monitoreo</span>
          <h1>{currentSection.label}</h1>
        </div>
      </div>

      <div className="topbar-actions">
        <div className="notification-area">
          <button
            className="icon-button"
            type="button"
            aria-expanded={notificationsOpen}
            aria-label="Notificaciones"
            onClick={onToggleNotifications}
          >
            <Bell size={19} />
            {hasUnreadAlerts && <span className="notification-dot"></span>}
          </button>

          {notificationsOpen && (
            <NotificationMenu alerts={alerts} onClose={onCloseNotifications} />
          )}
        </div>
        <button className="profile-button" type="button" aria-label="Perfil">
          <UserCircle size={28} />
        </button>
      </div>
    </header>
  )
}
