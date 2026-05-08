import type { ChangeEvent, FormEvent } from 'react'
import type {
  AddTankStatus,
  ApiStatus,
  ControlKey,
  DashboardData,
  NewTankForm,
  Tank,
} from '../types/aquasafe'
import { AlertsPanel } from '../components/dashboard/AlertsPanel'
import { MetricGrid } from '../components/dashboard/MetricGrid'
import { OverviewBand } from '../components/dashboard/OverviewBand'
import { TanksPanel } from '../components/dashboard/TanksPanel'
import { UsageChart } from '../components/dashboard/UsageChart'
import { ControlPanel } from '../components/control/ControlPanel'
import { SettingsPanel } from '../components/settings/SettingsPanel'

type DashboardViewProps = {
  apiStatus: ApiStatus
  controlState: Record<ControlKey, boolean>
  dashboardData: DashboardData
  editTankForm: NewTankForm
  editTankStatus: AddTankStatus
  editingTank: Tank | null
  isDarkTheme: boolean
  onCancelEditTank: () => void
  onDeleteTank: (tank: Tank) => void
  onEditTank: (tank: Tank) => void
  onEditTankChange: (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void
  onToggleControl: (id: ControlKey) => void
  onToggleTheme: () => void
  onUpdateTank: (event: FormEvent<HTMLFormElement>) => void
}

export function DashboardView({
  apiStatus,
  controlState,
  dashboardData,
  editTankForm,
  editTankStatus,
  editingTank,
  isDarkTheme,
  onCancelEditTank,
  onDeleteTank,
  onEditTank,
  onEditTankChange,
  onToggleControl,
  onToggleTheme,
  onUpdateTank,
}: DashboardViewProps) {
  return (
    <>
      <OverviewBand apiStatus={apiStatus} overview={dashboardData.overview} />
      <MetricGrid metrics={dashboardData.metrics} />

      <div className="content-grid">
        <TanksPanel
          editForm={editTankForm}
          editStatus={editTankStatus}
          editingTank={editingTank}
          tanks={dashboardData.tanks}
          onCancelEdit={onCancelEditTank}
          onDeleteTank={onDeleteTank}
          onEditChange={onEditTankChange}
          onEditTank={onEditTank}
          onUpdateTank={onUpdateTank}
        />
        <UsageChart hourlyUse={dashboardData.hourlyUse} />
      </div>

      <div className="content-grid lower-grid">
        <AlertsPanel alerts={dashboardData.alerts} />
        <ControlPanel controlState={controlState} onToggleControl={onToggleControl} />
        <SettingsPanel
          isDarkTheme={isDarkTheme}
          settings={dashboardData.settings}
          onToggleTheme={onToggleTheme}
        />
      </div>
    </>
  )
}
