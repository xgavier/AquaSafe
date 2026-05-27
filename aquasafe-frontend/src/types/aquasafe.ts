import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  icon: LucideIcon
}

export type DashboardMetric = {
  key: string
  label: string
  value: string
  trend: string
  tone: string
  bars: number[]
}

export type Tank = {
  id?: number
  identifier?: string
  name: string
  location: string
  level: number
  temperature?: number
  capacityLiters?: number
  capacity: string
  minLevelPercent?: number
  maxTemperatureC?: number
  status: string
  tone: string
}

export type AlertItem = {
  id?: number | string
  title: string
  detail: string
  time: string
  severity: 'critical' | 'warning' | 'ok'
  status?: string
  detectedAt?: string
  resolvedAt?: string | null
}

export type ControlKey = 'pump' | 'valve' | 'alarm'

export type ControlItem = {
  id: ControlKey
  title: string
  description: string
  icon: LucideIcon
}

export type ApiControl = {
  id: string
  title: string
  description: string
  enabled: boolean
}

export type SystemSetting = {
  key: string
  label: string
  value: string
  unit?: string | null
}

export type DashboardData = {
  overview: {
    status: string
    healthScore: number
    activeDevices: number
  }
  metrics: DashboardMetric[]
  tanks: Tank[]
  alerts: AlertItem[]
  controls: ApiControl[]
  settings: SystemSetting[]
  hourlyUse: number[]
}

export type NewTankForm = {
  name: string
  location: string
  capacityLiters: string
  initialLevelPercent: string
  initialTemperatureC: string
  minLevelPercent: string
  maxTemperatureC: string
  status: string
}

export type AddTankStatus =
  | { type: 'idle'; message: string }
  | { type: 'saving'; message: string }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }

export type ApiStatus = 'loading' | 'online' | 'offline'

export type AiRecommendation = {
  id: string
  title: string
  detail: string
  severity: 'critical' | 'warning' | 'ok'
  icon: string
}

export type AiRecommendationsResponse = {
  success: boolean
  source: string
  dbSource: string
  recommendations: AiRecommendation[]
}

