import type { ChangeEvent } from 'react'
import type { NewTankForm } from '../../types/aquasafe'

type TankFormFieldsProps = {
  form: NewTankForm
  levelLabel: string
  showPlaceholders?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
}

export function TankFormFields({
  form,
  levelLabel,
  showPlaceholders = false,
  onChange,
}: TankFormFieldsProps) {
  return (
    <>
      <label>
        <span>Nombre del tinaco</span>
        <input
          name="name"
          type="text"
          value={form.name}
          onChange={onChange}
          placeholder={showPlaceholders ? 'Ej. Tinaco comedor' : undefined}
          maxLength={80}
          required
        />
      </label>

      <label>
        <span>Ubicacion</span>
        <input
          name="location"
          type="text"
          value={form.location}
          onChange={onChange}
          placeholder={showPlaceholders ? 'Ej. Azotea principal' : undefined}
          maxLength={120}
          required
        />
      </label>

      <label>
        <span>Capacidad de agua (L)</span>
        <input
          name="capacityLiters"
          type="number"
          value={form.capacityLiters}
          onChange={onChange}
          min="1"
          step="1"
          placeholder={showPlaceholders ? '1100' : undefined}
          required
        />
      </label>

      <label>
        <span>{levelLabel}</span>
        <input
          name="initialLevelPercent"
          type="number"
          value={form.initialLevelPercent}
          onChange={onChange}
          min="0"
          max="100"
          step="1"
          required
        />
      </label>

      <label>
        <span>Temperatura inicial (C)</span>
        <input
          name="initialTemperatureC"
          type="number"
          value={form.initialTemperatureC}
          onChange={onChange}
          min="0"
          max="80"
          step="0.1"
          required
        />
      </label>

      <label>
        <span>Nivel minimo (%)</span>
        <input
          name="minLevelPercent"
          type="number"
          value={form.minLevelPercent}
          onChange={onChange}
          min="0"
          max="100"
          step="1"
          required
        />
      </label>

      <label>
        <span>Temperatura maxima (C)</span>
        <input
          name="maxTemperatureC"
          type="number"
          value={form.maxTemperatureC}
          onChange={onChange}
          min="0"
          max="80"
          step="0.1"
          required
        />
      </label>

      <label>
        <span>Estado</span>
        <select name="status" value={form.status} onChange={onChange}>
          <option value="Operativo">Operativo</option>
          <option value="Llenado parcial">Llenado parcial</option>
          <option value="Revisar consumo">Revisar consumo</option>
          <option value="Mantenimiento">Mantenimiento</option>
        </select>
      </label>
    </>
  )
}
