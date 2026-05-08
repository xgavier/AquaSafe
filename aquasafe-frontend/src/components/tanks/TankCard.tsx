import { Edit3, Trash2 } from 'lucide-react'
import type { Tank } from '../../types/aquasafe'

type TankCardProps = {
  tank: Tank
  onDelete: (tank: Tank) => void
  onEdit: (tank: Tank) => void
}

export function TankCard({ tank, onDelete, onEdit }: TankCardProps) {
  return (
    <article className="tank-card">
      <div className="tank-info">
        <div>
          <h3>{tank.name}</h3>
          <span className="tank-identifier">
            {tank.identifier ?? `AQS-${tank.id ?? 'LOCAL'}`}
          </span>
          <span>{tank.location}</span>
        </div>
        <div className="tank-card-actions">
          <span className={`badge text-bg-${tank.tone}`}>{tank.status}</span>
          <div className="tank-action-buttons">
            <button
              type="button"
              aria-label={`Editar ${tank.name}`}
              onClick={() => onEdit(tank)}
            >
              <Edit3 size={15} />
            </button>
            <button
              className="danger"
              type="button"
              aria-label={`Eliminar ${tank.name}`}
              onClick={() => onDelete(tank)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
      <div className="water-gauge" aria-label={`${tank.level}% de nivel`}>
        <div className="water-fill" style={{ height: `${tank.level}%` }}></div>
        <strong>{tank.level}%</strong>
      </div>
      <div className="tank-meta">
        <span>Capacidad</span>
        <strong>{tank.capacity}</strong>
      </div>
    </article>
  )
}
