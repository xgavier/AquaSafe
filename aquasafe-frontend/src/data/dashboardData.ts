import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  Droplets,
  FileText,
  Home,
  PlusCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Thermometer,
  Waves,
  Zap,
} from 'lucide-react'
import type {
  AlertItem,
  ControlItem,
  DashboardData,
  DashboardMetric,
  NavItem,
  NewTankForm,
  SystemSetting,
  Tank,
} from '../types/aquasafe'

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000/api'
export const THEME_STORAGE_KEY = 'aquasafe-theme'
export const ALERTS_SEEN_STORAGE_KEY = 'aquasafe-seen-alert-marker'

export const navigation: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'tinacos', label: 'Tinacos', icon: Building2 },
  { id: 'agregar-tinaco', label: 'Agregar tinaco', icon: PlusCircle },
  { id: 'alertas', label: 'Alertas', icon: Bell },
  { id: 'control', label: 'Control', icon: SlidersHorizontal },
  { id: 'reportes', label: 'Reportes', icon: FileText },
  { id: 'configuracion', label: 'Configuracion', icon: Settings },
]

export const metricIcons: Record<string, LucideIcon> = {
  level: Droplets,
  temperature: Thermometer,
  consumption: Activity,
  risk: ShieldCheck,
}

export const fallbackMetrics: DashboardMetric[] = [
  {
    key: 'level',
    label: 'Nivel promedio',
    value: '76%',
    trend: '+8% vs ayer',
    tone: 'aqua',
    bars: [45, 58, 62, 72, 76, 79, 76],
  },
  {
    key: 'temperature',
    label: 'Temperatura',
    value: '24.8 C',
    trend: 'Estable',
    tone: 'teal',
    bars: [48, 51, 49, 54, 52, 53, 51],
  },
  {
    key: 'consumption',
    label: 'Consumo diario',
    value: '1,280 L',
    trend: '-12% esperado',
    tone: 'amber',
    bars: [74, 66, 71, 55, 48, 43, 51],
  },
  {
    key: 'risk',
    label: 'Riesgo activo',
    value: 'Bajo',
    trend: '1 alerta menor',
    tone: 'coral',
    bars: [32, 28, 24, 21, 18, 16, 14],
  },
]

export const fallbackTanks: Tank[] = [
  {
    name: 'Tinaco Norte',
    location: 'Planta alta',
    level: 82,
    capacity: '1,100 L',
    status: 'Operativo',
    tone: 'success',
  },
  {
    name: 'Deposito Central',
    location: 'Patio tecnico',
    level: 64,
    capacity: '2,500 L',
    status: 'Llenado parcial',
    tone: 'info',
  },
  {
    name: 'Reserva Sur',
    location: 'Area de servicio',
    level: 38,
    capacity: '900 L',
    status: 'Revisar consumo',
    tone: 'warning',
  },
]

export const fallbackAlerts: AlertItem[] = [
  {
    title: 'Consumo fuera de horario',
    detail: 'Flujo sostenido detectado durante 18 minutos.',
    time: 'Hace 6 min',
    severity: 'warning',
  },
  {
    title: 'Tinaco Norte recuperado',
    detail: 'Nivel normalizado despues del ciclo de bomba.',
    time: 'Hace 24 min',
    severity: 'ok',
  },
  {
    title: 'Reserva Sur en observacion',
    detail: 'Nivel por debajo del umbral de operacion.',
    time: 'Hace 41 min',
    severity: 'critical',
  },
]

export const controlMetadata: ControlItem[] = [
  {
    id: 'pump',
    title: 'Bomba automatica',
    description: 'Presuriza el llenado cuando el nivel baja.',
    icon: Zap,
  },
  {
    id: 'valve',
    title: 'Valvula inteligente',
    description: 'Regula el paso de agua hacia los depositos.',
    icon: Waves,
  },
  {
    id: 'alarm',
    title: 'Alarma sonora',
    description: 'Avisa fugas, sobreconsumo o desabastecimiento.',
    icon: AlertTriangle,
  },
]

export const fallbackSettings: SystemSetting[] = [
  { key: 'min_level_percent', label: 'Nivel minimo', value: '35', unit: '%' },
  { key: 'max_temperature_c', label: 'Temperatura maxima', value: '31', unit: 'C' },
  {
    key: 'abnormal_consumption_percent',
    label: 'Consumo anormal',
    value: '+24',
    unit: '%',
  },
]

export const fallbackDashboard: DashboardData = {
  overview: {
    status: 'Sistema estable',
    healthScore: 92,
    activeDevices: 3,
  },
  metrics: fallbackMetrics,
  tanks: fallbackTanks,
  alerts: fallbackAlerts,
  controls: [],
  settings: fallbackSettings,
  hourlyUse: [38, 46, 35, 58, 74, 63, 84, 69, 52, 47, 61, 76],
}

export const initialTankForm: NewTankForm = {
  name: '',
  location: '',
  capacityLiters: '',
  initialLevelPercent: '50',
  initialTemperatureC: '24',
  minLevelPercent: '35',
  maxTemperatureC: '31',
  status: 'Operativo',
}
