import { Power } from 'lucide-react'
import { controlMetadata } from '../../data/dashboardData'
import type { ControlKey } from '../../types/aquasafe'

type ControlPanelProps = {
  controlState: Record<ControlKey, boolean>
  onToggleControl: (id: ControlKey) => void
}

export function ControlPanel({ controlState, onToggleControl }: ControlPanelProps) {
  return (
    <section className="panel-card" id="control">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Control</span>
          <h2>Dispositivos conectados</h2>
        </div>
        <Power size={22} />
      </div>
      <div className="control-list">
        {controlMetadata.map((control) => {
          const Icon = control.icon
          const enabled = controlState[control.id]
          return (
            <article className="control-row" key={control.id}>
              <div className="control-icon">
                <Icon size={20} />
              </div>
              <div className="control-copy">
                <h3>{control.title}</h3>
                <p>{control.description}</p>
              </div>
              <button
                aria-pressed={enabled}
                className={`toggle-switch ${enabled ? 'on' : ''}`}
                type="button"
                onClick={() => onToggleControl(control.id)}
              >
                <span></span>
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
