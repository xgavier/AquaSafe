import {
  ALERTS_SEEN_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '../data/dashboardData'

export const getStoredDarkTheme = () => {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
}

export const getStoredSeenAlertMarker = () => {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.localStorage.getItem(ALERTS_SEEN_STORAGE_KEY) ?? ''
}
