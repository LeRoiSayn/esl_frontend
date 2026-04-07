import { useState, useEffect, useRef } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import api from '../services/api'

const iconMap = {
  currency: CurrencyDollarIcon,
  exclamation: ExclamationTriangleIcon,
  academic: AcademicCapIcon,
  calendar: CalendarIcon,
  chart: ChartBarIcon,
  document: DocumentTextIcon,
  clock: ClockIcon,
  users: UserGroupIcon,
  check: CheckCircleIcon,
}

const priorityColors = {
  high: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
  medium: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
  low: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
}

const priorityIconColors = {
  high: 'text-red-500 bg-red-100 dark:bg-red-900/30',
  medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  low: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
}

export default function NotificationDropdown({ t: tProp }) {
  const { t: tI18n } = useI18n()
  const t = tProp || tI18n
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch notifications when opening
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      fetchNotifications()
    }
  }, [isOpen])

  // Fetch on mount (delayed 1.5s so the dashboard data loads first) and periodically
  useEffect(() => {
    const initial = setTimeout(fetchNotifications, 1500)
    const interval = setInterval(fetchNotifications, 60000) // Every 60 seconds
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await api.get('/notifications')
      setNotifications(response.data.notifications || [])
      setUnreadCount(response.data.unread_count || 0)
    } catch (error) {
      // silent
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)

    if (diff < 60) return t('just_now')
    if (diff < 3600) return `${Math.floor(diff / 60)} ${t('minutes_ago')}`
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${t('hours_ago')}`
    if (diff < 604800) return `${Math.floor(diff / 86400)} ${t('days_ago')}`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
        title={t?.('notifications') || 'Notifications'}
      >
        <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-96 max-h-[520px] bg-white dark:bg-dark-200 rounded-xl shadow-xl border border-gray-200 dark:border-dark-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300">
              <div className="flex items-center gap-2">
                <BellIcon className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {t?.('notifications') || 'Notifications'}
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto max-h-[420px]">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t?.('loading') || 'Chargement...'}</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t?.('no_notifications') || 'Aucune notification'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {t?.('up_to_date') || 'Vous êtes à jour !'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-dark-100">
                  {notifications.map((notification) => {
                    const IconComponent = iconMap[notification.icon] || BellIcon
                    const colorClass = priorityColors[notification.priority] || priorityColors.low
                    const iconColorClass = priorityIconColors[notification.priority] || priorityIconColors.low

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`px-4 py-3 border-l-4 hover:bg-gray-50 dark:hover:bg-dark-300/50 transition-colors cursor-default ${colorClass} ${
                          notification.read ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColorClass}`}>
                            <IconComponent className="w-4.5 h-4.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm text-gray-900 dark:text-white leading-tight">
                                {notification.title}
                              </p>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap mt-0.5">
                                {formatTimeAgo(notification.date)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300">
                <button
                  onClick={fetchNotifications}
                  className="w-full text-center text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  {t?.('refresh') || 'Rafraîchir'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
