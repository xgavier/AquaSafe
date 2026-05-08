import type { ControlKey } from '../types/aquasafe'

export const isControlKey = (value: string): value is ControlKey =>
  value === 'pump' || value === 'valve' || value === 'alarm'
