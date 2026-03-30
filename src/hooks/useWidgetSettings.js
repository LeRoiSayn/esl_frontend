const STORAGE_KEY = 'esl_user_settings'

export function useWidgetSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed.dashboard_widgets)) {
        const enabled = parsed.dashboard_widgets
        return (widgetId) => enabled.includes(widgetId)
      }
    }
  } catch (_) {}

  // No settings saved yet → show all widgets
  return () => true
}
