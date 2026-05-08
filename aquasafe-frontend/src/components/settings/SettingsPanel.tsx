import { Settings } from 'lucide-react'
import type { SystemSetting } from '../../types/aquasafe'
import { formatSettingValue } from '../../utils/formatters'

type SettingsPanelProps = {
  isDarkTheme: boolean
  settings: SystemSetting[]
  onToggleTheme: () => void
}

export function SettingsPanel({
  isDarkTheme,
  settings,
  onToggleTheme,
}: SettingsPanelProps) {
  return (
    <section className="panel-card compact-settings" id="configuracion">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Configuracion</span>
          <h2>Reglas activas</h2>
        </div>
        <Settings size={22} />
      </div>
      <div className="rule-list">
        {settings.map((setting) => (
          <div key={setting.key}>
            <span>{setting.label}</span>
            <strong>{formatSettingValue(setting)}</strong>
          </div>
        ))}
      </div>
      <div className="theme-settings">
        <article className="theme-row">
          <div className="theme-copy">
            <h3>Tema oscuro</h3>
            <p>Activa una apariencia de alto contraste para el panel.</p>
          </div>
          <button
            aria-label="Activar tema oscuro"
            aria-pressed={isDarkTheme}
            className={`toggle-switch ${isDarkTheme ? 'on' : ''}`}
            type="button"
            onClick={onToggleTheme}
          >
            <span></span>
          </button>
        </article>
      </div>
    </section>
  )
}
