import { Droplets } from 'lucide-react'
import type { NavItem } from '../../types/aquasafe'

type SidebarProps = {
  activeSection: string
  activeSensorsCount: number
  navigation: NavItem[]
  open: boolean
  onNavigate: (sectionId: string) => void
}

export function Sidebar({
  activeSection,
  activeSensorsCount,
  navigation,
  open,
  onNavigate,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${open ? 'show' : ''}`}>
      <div className="brand-area">
        <div className="brand-mark">
          <Droplets size={24} />
        </div>
        <div>
          <span className="brand-name">AquaSafe</span>
          <small>Water Intelligence</small>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Menu principal">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-status">
        <div className="status-dot"></div>
        <div>
          <strong>Sensores en linea</strong>
          <span>
            {activeSensorsCount}{' '}
            {activeSensorsCount === 1 ? 'sensor activo' : 'sensores activos'}
          </span>
        </div>
      </div>
    </aside>
  )
}
