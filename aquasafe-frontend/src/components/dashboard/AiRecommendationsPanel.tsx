import * as LucideIcons from 'lucide-react'
import type { AiRecommendation } from '../../types/aquasafe'

type AiRecommendationsPanelProps = {
  recommendations: AiRecommendation[]
  source: string
  dbSource: string
  loading: boolean
}

export function AiRecommendationsPanel({
  recommendations,
  source,
  dbSource,
  loading,
}: AiRecommendationsPanelProps) {
  // Función para obtener el componente Lucide correspondiente según el string recibido
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Sparkles
    return <IconComponent size={20} className="recommendation-icon" />
  }

  // Clases CSS según la severidad
  const getSeverityClass = (severity: 'critical' | 'warning' | 'ok') => {
    switch (severity) {
      case 'critical':
        return 'severity-critical pulse-red'
      case 'warning':
        return 'severity-warning'
      case 'ok':
        return 'severity-ok'
      default:
        return ''
    }
  }

  return (
    <section className="panel-card ai-panel" id="recomendaciones-ia">
      <div className="section-heading">
        <div>
          <span className="eyebrow ai-glow">Inteligencia Artificial</span>
          <h2>Recomendaciones AquaSafe</h2>
        </div>
        <LucideIcons.Brain size={24} className="brain-pulsing" />
      </div>

      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-4 text-muted">
          <div className="spinner-border spinner-border-sm text-info mb-2" role="status" />
          <span className="small">Consultando IA...</span>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-3 text-muted small">
          No hay recomendaciones disponibles en este momento.
        </div>
      ) : (
        <div className="recommendations-container">
          <div className="recommendations-list">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`recommendation-item ${getSeverityClass(rec.severity)}`}
              >
                <div className="recommendation-header">
                  {getIcon(rec.icon)}
                  <span className="recommendation-title">{rec.title}</span>
                </div>
                <p className="recommendation-detail">{rec.detail}</p>
              </div>
            ))}
          </div>

          <div className="ai-metadata mt-3 pt-2 d-flex justify-content-between align-items-center border-top">
            <span className="source-tag">
              Motor: <span className="source-name">{source}</span>
            </span>
            <span className="source-tag">
              Datos: <span className="source-name">{dbSource}</span>
            </span>
          </div>
        </div>
      )}
    </section>
  )
}
