import type { SystemSetting } from '../types/aquasafe'

export const formatSettingValue = (setting: SystemSetting) => {
  if (!setting.unit) {
    return setting.value
  }

  if (setting.unit === '%') {
    return `${setting.value}%`
  }

  return `${setting.value} ${setting.unit}`
}

export const parseCapacityLiters = (capacity: string) =>
  capacity ? capacity.replace(/[^\d]/g, '') : ''
