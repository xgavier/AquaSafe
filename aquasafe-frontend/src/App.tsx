import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  ALERTS_SEEN_STORAGE_KEY,
  API_BASE_URL,
  THEME_STORAGE_KEY,
  fallbackAlerts,
  fallbackDashboard,
  initialTankForm,
  navigation,
} from './data/dashboardData'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { AddTankView } from './views/AddTankView'
import { DashboardView } from './views/DashboardView'
import type {
  AddTankStatus,
  AlertItem,
  ApiControl,
  ApiStatus,
  ControlKey,
  DashboardData,
  NewTankForm,
  Tank,
} from './types/aquasafe'
import { getAlertMarker } from './utils/alerts'
import { parseCapacityLiters } from './utils/formatters'
import { isControlKey } from './utils/guards'
import { getStoredDarkTheme, getStoredSeenAlertMarker } from './utils/storage'
import './App.css'

function App() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [apiStatus, setApiStatus] = useState<ApiStatus>('loading')
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(fallbackDashboard)
  const [allAlerts, setAllAlerts] = useState<AlertItem[]>(fallbackAlerts)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [seenAlertMarker, setSeenAlertMarker] = useState(
    getStoredSeenAlertMarker,
  )
  const [tankForm, setTankForm] = useState<NewTankForm>(initialTankForm)
  const [editingTank, setEditingTank] = useState<Tank | null>(null)
  const [editTankForm, setEditTankForm] = useState<NewTankForm>(initialTankForm)
  const [addTankStatus, setAddTankStatus] = useState<AddTankStatus>({
    type: 'idle',
    message: '',
  })
  const [editTankStatus, setEditTankStatus] = useState<AddTankStatus>({
    type: 'idle',
    message: '',
  })
  const [controlState, setControlState] = useState<Record<ControlKey, boolean>>({
    pump: true,
    valve: true,
    alarm: false,
  })
  const [isDarkTheme, setIsDarkTheme] = useState(getStoredDarkTheme)

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard`, { signal })

      if (!response.ok) {
        throw new Error('No se pudo cargar el dashboard.')
      }

      const data = (await response.json()) as DashboardData
      const normalizedData: DashboardData = {
        ...fallbackDashboard,
        ...data,
        overview: data.overview ?? fallbackDashboard.overview,
        metrics: data.metrics?.length ? data.metrics : fallbackDashboard.metrics,
        tanks: data.tanks?.length ? data.tanks : fallbackDashboard.tanks,
        alerts: data.alerts ?? fallbackDashboard.alerts,
        controls: data.controls ?? fallbackDashboard.controls,
        settings: data.settings?.length ? data.settings : fallbackDashboard.settings,
        hourlyUse: data.hourlyUse?.length
          ? data.hourlyUse
          : fallbackDashboard.hourlyUse,
      }

      const nextControlState = (data.controls ?? []).reduce<
        Partial<Record<ControlKey, boolean>>
      >((current, control) => {
        if (isControlKey(control.id)) {
          current[control.id] = control.enabled
        }

        return current
      }, {})

      setDashboardData(normalizedData)
      setControlState((current) => ({ ...current, ...nextControlState }))
      setApiStatus('online')
    } catch {
      if (!signal?.aborted) {
        setApiStatus('offline')
      }
    }
  }, [])

  const loadAlerts = useCallback(
    async (signal?: AbortSignal, markAsSeen = false) => {
      try {
        const response = await fetch(`${API_BASE_URL}/alerts`, { signal })

        if (!response.ok) {
          throw new Error('No se pudieron cargar las alertas.')
        }

        const data = (await response.json()) as AlertItem[]
        const nextAlertMarker = getAlertMarker(data[0])

        setAllAlerts(data)

        if ((markAsSeen || notificationsOpen) && nextAlertMarker) {
          setSeenAlertMarker(nextAlertMarker)
          window.localStorage.setItem(
            ALERTS_SEEN_STORAGE_KEY,
            nextAlertMarker,
          )
        }

        setApiStatus('online')
      } catch {
        if (!signal?.aborted) {
          setApiStatus('offline')
        }
      }
    },
    [notificationsOpen],
  )

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() =>
      Promise.all([
        loadDashboard(controller.signal),
        loadAlerts(controller.signal),
      ]),
    )

    const refreshInterval = window.setInterval(() => {
      void loadDashboard()
      void loadAlerts()
    }, 30000)

    return () => {
      controller.abort()
      window.clearInterval(refreshInterval)
    }
  }, [loadDashboard, loadAlerts])

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkTheme ? 'dark' : 'light'
    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      isDarkTheme ? 'dark' : 'light',
    )
  }, [isDarkTheme])

  const currentSection = useMemo(
    () => navigation.find((item) => item.id === activeSection) ?? navigation[0],
    [activeSection],
  )
  const isAddTankScreen = activeSection === 'agregar-tinaco'
  const latestAlertMarker = useMemo(() => getAlertMarker(allAlerts[0]), [allAlerts])
  const hasUnreadAlerts = Boolean(
    latestAlertMarker && latestAlertMarker !== seenAlertMarker,
  )

  const markLatestAlertsSeen = useCallback(() => {
    if (!latestAlertMarker) {
      return
    }

    setSeenAlertMarker(latestAlertMarker)
    window.localStorage.setItem(ALERTS_SEEN_STORAGE_KEY, latestAlertMarker)
  }, [latestAlertMarker])

  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId)
    setSidebarOpen(false)

    if (sectionId === 'agregar-tinaco') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  const handleNotificationsToggle = () => {
    const nextOpen = !notificationsOpen
    setNotificationsOpen(nextOpen)

    if (nextOpen) {
      markLatestAlertsSeen()
      void loadAlerts(undefined, true)
    }
  }

  const handleTankInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setTankForm((current) => ({ ...current, [name]: value }))
  }

  const handleEditTankInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target
    setEditTankForm((current) => ({ ...current, [name]: value }))
  }

  const openEditTank = (tank: Tank) => {
    setEditingTank(tank)
    setEditTankStatus({ type: 'idle', message: '' })
    setEditTankForm({
      name: tank.name,
      location: tank.location,
      capacityLiters: String(tank.capacityLiters ?? parseCapacityLiters(tank.capacity)),
      initialLevelPercent: String(tank.level),
      initialTemperatureC: String(tank.temperature ?? 24),
      minLevelPercent: String(tank.minLevelPercent ?? 35),
      maxTemperatureC: String(tank.maxTemperatureC ?? 31),
      status: tank.status,
    })
  }

  const closeEditTank = () => {
    setEditingTank(null)
    setEditTankForm(initialTankForm)
    setEditTankStatus({ type: 'idle', message: '' })
  }

  const refreshDashboardAndAlerts = async () => {
    await loadDashboard()
    await loadAlerts()
  }

  const handleAddTank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAddTankStatus({
      type: 'saving',
      message: 'Guardando cisterna en SQL Server...',
    })

    try {
      const response = await fetch(`${API_BASE_URL}/tanks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tankForm.name,
          location: tankForm.location,
          capacityLiters: Number(tankForm.capacityLiters),
          initialLevelPercent: Number(tankForm.initialLevelPercent),
          initialTemperatureC: Number(tankForm.initialTemperatureC),
          minLevelPercent: Number(tankForm.minLevelPercent),
          maxTemperatureC: Number(tankForm.maxTemperatureC),
          status: tankForm.status,
        }),
      })

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { errors?: string[]; error?: string }
          | null
        throw new Error(
          errorBody?.errors?.join(' ') ??
            errorBody?.error ??
            'No se pudo crear la cisterna.',
        )
      }

      await refreshDashboardAndAlerts()
      setTankForm(initialTankForm)
      setAddTankStatus({
        type: 'success',
        message: 'Cisterna agregada correctamente.',
      })
      setActiveSection('tinacos')
      window.requestAnimationFrame(() => {
        document.getElementById('tinacos')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      })
    } catch (error) {
      setApiStatus('offline')
      setAddTankStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo crear la cisterna.',
      })
    }
  }

  const handleUpdateTank = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editingTank?.id) {
      setEditTankStatus({
        type: 'error',
        message: 'No se encontro la cisterna seleccionada.',
      })
      return
    }

    setEditTankStatus({
      type: 'saving',
      message: 'Actualizando cisterna en SQL Server...',
    })

    try {
      const response = await fetch(`${API_BASE_URL}/tanks/${editingTank.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editTankForm.name,
          location: editTankForm.location,
          capacityLiters: Number(editTankForm.capacityLiters),
          levelPercent: Number(editTankForm.initialLevelPercent),
          temperatureC: Number(editTankForm.initialTemperatureC),
          minLevelPercent: Number(editTankForm.minLevelPercent),
          maxTemperatureC: Number(editTankForm.maxTemperatureC),
          status: editTankForm.status,
        }),
      })

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { errors?: string[]; error?: string }
          | null
        throw new Error(
          errorBody?.errors?.join(' ') ??
            errorBody?.error ??
            'No se pudo actualizar la cisterna.',
        )
      }

      await refreshDashboardAndAlerts()
      setEditTankStatus({
        type: 'success',
        message: 'Cisterna actualizada correctamente.',
      })
      closeEditTank()
    } catch (error) {
      setApiStatus('offline')
      setEditTankStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la cisterna.',
      })
    }
  }

  const handleDeleteTank = async (tank: Tank) => {
    if (!tank.id) {
      return
    }

    const shouldDelete = window.confirm(
      `Quieres eliminar la cisterna "${tank.name}"? Esta accion tambien eliminara sus lecturas y sensores asociados.`,
    )

    if (!shouldDelete) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/tanks/${tank.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(errorBody?.error ?? 'No se pudo eliminar la cisterna.')
      }

      if (editingTank?.id === tank.id) {
        closeEditTank()
      }

      await refreshDashboardAndAlerts()
      setApiStatus('online')
    } catch (error) {
      setApiStatus('offline')
      setEditTankStatus({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'No se pudo eliminar la cisterna.',
      })
    }
  }

  const toggleControl = async (id: ControlKey) => {
    const enabled = !controlState[id]
    setControlState((current) => ({ ...current, [id]: enabled }))

    try {
      const response = await fetch(`${API_BASE_URL}/controls/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        throw new Error('No se pudo actualizar el control.')
      }

      const updatedControl = (await response.json()) as ApiControl
      if (isControlKey(updatedControl.id)) {
        setControlState((current) => ({
          ...current,
          [updatedControl.id]: updatedControl.enabled,
        }))
      }

      setApiStatus('online')
    } catch {
      setApiStatus('offline')
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeSection={activeSection}
        activeSensorsCount={dashboardData.overview.activeDevices}
        navigation={navigation}
        open={sidebarOpen}
        onNavigate={handleNavigate}
      />

      {sidebarOpen && (
        <button
          aria-label="Cerrar menu"
          className="sidebar-backdrop"
          type="button"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="main-area">
        <Topbar
          alerts={allAlerts}
          currentSection={currentSection}
          hasUnreadAlerts={hasUnreadAlerts}
          notificationsOpen={notificationsOpen}
          sidebarOpen={sidebarOpen}
          onCloseNotifications={() => setNotificationsOpen(false)}
          onToggleNotifications={handleNotificationsToggle}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />

        {isAddTankScreen ? (
          <AddTankView
            form={tankForm}
            status={addTankStatus}
            onChange={handleTankInputChange}
            onSubmit={handleAddTank}
          />
        ) : (
          <DashboardView
            apiStatus={apiStatus}
            controlState={controlState}
            dashboardData={dashboardData}
            editTankForm={editTankForm}
            editTankStatus={editTankStatus}
            editingTank={editingTank}
            isDarkTheme={isDarkTheme}
            onCancelEditTank={closeEditTank}
            onDeleteTank={handleDeleteTank}
            onEditTank={openEditTank}
            onEditTankChange={handleEditTankInputChange}
            onToggleControl={toggleControl}
            onToggleTheme={() => setIsDarkTheme((current) => !current)}
            onUpdateTank={handleUpdateTank}
          />
        )}
      </main>
    </div>
  )
}

export default App
