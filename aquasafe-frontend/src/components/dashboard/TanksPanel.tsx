import type { ChangeEvent, FormEvent } from 'react'
import type { AddTankStatus, NewTankForm, Tank } from '../../types/aquasafe'
import { EditTankForm } from '../tanks/EditTankForm'
import { TankCard } from '../tanks/TankCard'

type TanksPanelProps = {
  editForm: NewTankForm
  editStatus: AddTankStatus
  editingTank: Tank | null
  tanks: Tank[]
  onCancelEdit: () => void
  onDeleteTank: (tank: Tank) => void
  onEditChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onEditTank: (tank: Tank) => void
  onUpdateTank: (event: FormEvent<HTMLFormElement>) => void
}

export function TanksPanel({
  editForm,
  editStatus,
  editingTank,
  tanks,
  onCancelEdit,
  onDeleteTank,
  onEditChange,
  onEditTank,
  onUpdateTank,
}: TanksPanelProps) {
  return (
    <section className="panel-section" id="tinacos">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Depositos</span>
          <h2>Monitoreo de cisternas</h2>
        </div>
        <button className="soft-button" type="button">
          Ver todos
        </button>
      </div>

      {editingTank && (
        <EditTankForm
          form={editForm}
          status={editStatus}
          tank={editingTank}
          onCancel={onCancelEdit}
          onChange={onEditChange}
          onSubmit={onUpdateTank}
        />
      )}

      <div className="tank-grid">
        {tanks.map((tank) => (
          <TankCard
            key={tank.id ?? tank.name}
            tank={tank}
            onDelete={onDeleteTank}
            onEdit={onEditTank}
          />
        ))}
      </div>
    </section>
  )
}
