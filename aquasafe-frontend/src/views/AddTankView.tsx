import type { ChangeEvent, FormEvent } from 'react'
import { PlusCircle, Save } from 'lucide-react'
import type { AddTankStatus, NewTankForm } from '../types/aquasafe'
import { FormStatusMessage } from '../components/tanks/FormStatusMessage'
import { TankFormFields } from '../components/tanks/TankFormFields'

type AddTankViewProps = {
  form: NewTankForm
  status: AddTankStatus
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AddTankView({ form, status, onChange, onSubmit }: AddTankViewProps) {
  return (
    <section className="panel-card add-tank-panel add-tank-screen" id="agregar-tinaco">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Nuevo deposito</span>
          <h2>Agregar cisterna</h2>
        </div>
        <PlusCircle size={22} />
      </div>

      <form className="add-tank-form" onSubmit={onSubmit}>
        <TankFormFields
          form={form}
          levelLabel="Nivel inicial (%)"
          showPlaceholders
          onChange={onChange}
        />

        <div className="form-actions">
          <FormStatusMessage status={status} />
          <button
            className="primary-button"
            type="submit"
            disabled={status.type === 'saving'}
          >
            <Save size={18} />
            {status.type === 'saving' ? 'Guardando' : 'Guardar cisterna'}
          </button>
        </div>
      </form>
    </section>
  )
}
