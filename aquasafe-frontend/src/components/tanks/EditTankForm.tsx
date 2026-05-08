import type { ChangeEvent, FormEvent } from 'react'
import { Save } from 'lucide-react'
import type { AddTankStatus, NewTankForm, Tank } from '../../types/aquasafe'
import { FormStatusMessage } from './FormStatusMessage'
import { TankFormFields } from './TankFormFields'

type EditTankFormProps = {
  form: NewTankForm
  status: AddTankStatus
  tank: Tank
  onCancel: () => void
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function EditTankForm({
  form,
  status,
  tank,
  onCancel,
  onChange,
  onSubmit,
}: EditTankFormProps) {
  return (
    <form className="edit-tank-form" onSubmit={onSubmit}>
      <div className="edit-form-heading">
        <div>
          <span className="eyebrow">Editar tinaco</span>
          <h3>{tank.identifier ?? `AQS-${tank.id}`}</h3>
        </div>
        <button className="soft-button" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>

      <div className="add-tank-form">
        <TankFormFields form={form} levelLabel="Nivel actual (%)" onChange={onChange} />
      </div>

      <div className="form-actions">
        <FormStatusMessage status={status} />
        <button
          className="primary-button"
          type="submit"
          disabled={status.type === 'saving'}
        >
          <Save size={18} />
          {status.type === 'saving' ? 'Guardando' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
