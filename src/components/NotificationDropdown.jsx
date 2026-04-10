import { useState, useEffect, useRef, useCallback } from 'react'
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
  TrashIcon,
} from '@heroicons/react/24/outline'
import api, { notificationApi } from '../services/api'

const DISMISSED_KEY = 'esl_dismissed_notifications'
const SEEN_KEY      = 'esl_seen_notif_ids'

function loadDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')) }
  catch { return new Set() }
}
function saveDismissed(set) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]))
}
function loadSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')) }
  catch { return new Set() }
}
function saveSeen(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]))
}

/**
 * Singleton AudioContext — created once, kept alive, resumed on user gestures.
 * Browsers suspend AudioContext when created outside a user gesture; resuming
 * it on any click unlocks future playback without requiring a gesture each time.
 */
let _audioCtx = null
function _getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    } catch (_) { return null }
  }
  return _audioCtx
}
// Unlock the context on any user interaction (runs once, then keeps listening
// so the context stays resumed after mobile browsers auto-suspend it again)
if (typeof window !== 'undefined') {
  const _unlock = () => { _getAudioCtx()?.resume().catch(() => {}) }
  window.addEventListener('click',     _unlock, { passive: true })
  window.addEventListener('touchstart', _unlock, { passive: true })
  window.addEventListener('keydown',   _unlock, { passive: true })
}

/**
 * Play a single soft "ting" notification chime using the Web Audio API.
 * No external file needed. Fails silently if audio is unavailable.
 */
function playTing() {
  try {
    const ctx = _getAudioCtx()
    if (!ctx) return
    // Resume is async; we schedule notes slightly in the future so they play
    // even if the resume completes a few ms after this call.
    ctx.resume().then(() => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      const t = ctx.currentTime + 0.05   // small offset to ensure resume is done
      // A5 → gentle slide to E5
      osc.frequency.setValueAtTime(880, t)
      osc.frequency.exponentialRampToValueAtTime(659, t + 0.18)
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55)
      osc.start(t)
      osc.stop(t + 0.6)
    }).catch(() => {})
  } catch (_) {
    // Audio not supported — silent fail
  }
}

const iconMap = {
  currency:    CurrencyDollarIcon,
  exclamation: ExclamationTriangleIcon,
  academic:    AcademicCapIcon,
  calendar:    CalendarIcon,
  chart:       ChartBarIcon,
  document:    DocumentTextIcon,
  clock:       ClockIcon,
  users:       UserGroupIcon,
  check:       CheckCircleIcon,
}

const priorityColors = {
  high:   'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
  medium: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
  low:    'border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
}
const priorityIconColors = {
  high:   'text-red-500 bg-red-100 dark:bg-red-900/30',
  medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  low:    'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
}

export default function NotificationDropdown({ t: tProp }) {
  const { t: tI18n } = useI18n()
  const t = tProp || tI18n

  const [isOpen, setIsOpen]           = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]         = useState(false)
  const [dismissed, setDismissed]     = useState(loadDismissed)
  const [seen, setSeen]               = useState(loadSeen)
  const [deleting, setDeleting]       = useState(null)

  const dropdownRef  = useRef(null)
  const notifsRef    = useRef([])          // always mirrors `notifications` — avoids stale closures
  const dismissedRef = useRef(dismissed)   // mirrors `dismissed`
  // true after the very first successful fetch in this browser session
  const hasSoundedRef = useRef(false)

  // Keep refs in sync
  useEffect(() => { notifsRef.current    = notifications }, [notifications])
  useEffect(() => { dismissedRef.current = dismissed     }, [dismissed])

  // ---------- mark all currently-visible notifications as seen ----------
  const markAsSeen = useCallback(() => {
    const current = loadSeen()
    notifsRef.current
      .filter(n => !dismissedRef.current.has(n.id))
      .forEach(n => current.add(n.id))
    setSeen(new Set(current))
    saveSeen(current)
  }, [])

  // ---------- bell toggle: close → mark as seen ----------
  const handleBellToggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev
      if (!next) {
        markAsSeen()   // closing the panel → badge clears
      } else {
        // Opening: this IS a user gesture — play sound if unseen notifications exist
        const currentSeen      = loadSeen()
        const currentDismissed = loadDismissed()
        const hasUnseen = notifsRef.current.some(
          n => !currentSeen.has(n.id) && !currentDismissed.has(n.id)
        )
        if (hasUnseen) playTing()
      }
      return next
    })
  }, [markAsSeen])

  // ---------- close on outside click ----------
  useEffect(() => {
    const handle = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(prev => {
          if (prev) markAsSeen()
          return false
        })
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [markAsSeen])

  // ---------- fetch on open if empty ----------
  useEffect(() => {
    if (isOpen && notifications.length === 0) fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // ---------- initial delayed fetch + periodic refresh ----------
  useEffect(() => {
    const initial  = setTimeout(fetchNotifications, 1500)
    const interval = setInterval(fetchNotifications, 60000)
    return () => { clearTimeout(initial); clearInterval(interval) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await api.get('/notifications')
      const fetched  = response.data.notifications || []
      setNotifications(fetched)

      // Play ting once per session if there are new unseen notifications
      if (!hasSoundedRef.current) {
        hasSoundedRef.current = true
        const currentSeen      = loadSeen()
        const currentDismissed = loadDismissed()
        const hasNewUnseen = fetched.some(
          n => !currentSeen.has(n.id) && !currentDismissed.has(n.id) && !n.read
        )
        if (hasNewUnseen) playTing()
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  // ---------- delete single ----------
  const handleDelete = async (e, id) => {
    e.stopPropagation()
    setDeleting(id)
    try {
      if (String(id).startsWith('notif_')) {
        await notificationApi.deleteOne(String(id).replace('notif_', ''))
      }
      const next = new Set(dismissed)
      next.add(id)
      setDismissed(next)
      saveDismissed(next)
    } catch {
      // silent
    } finally {
      setDeleting(null)
    }
  }

  // ---------- delete all ----------
  const handleDeleteAll = async () => {
    try { await notificationApi.deleteAll() } catch { /* silent */ }
    const next = new Set(dismissed)
    notifications.forEach(n => next.add(n.id))
    setDismissed(next)
    saveDismissed(next)
    // Also mark all as seen so badge stays 0
    markAsSeen()
  }

  const formatTimeAgo = (dateStr) => {
    const date = new Date(dateStr)
    const diff = Math.floor((Date.now() - date) / 1000)
    if (diff < 60)     return t('just_now')
    if (diff < 3600)   return `${Math.floor(diff / 60)} ${t('minutes_ago')}`
    if (diff < 86400)  return `${Math.floor(diff / 3600)} ${t('hours_ago')}`
    if (diff < 604800) return `${Math.floor(diff / 86400)} ${t('days_ago')}`
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  }

  const visible     = notifications.filter(n => !dismissed.has(n.id))
  const unseenCount = visible.filter(n => !seen.has(n.id)).length

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellToggle}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
        title={t('notifications')}
      >
        <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        {unseenCount > 0 && (
          <motion.span
            key={unseenCount}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1"
          >
            {unseenCount > 9 ? '9+' : unseenCount}
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
                  {t('notifications')}
                </h3>
                {unseenCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                    {unseenCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {visible.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    title={t('clear_all')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    <span>{t('clear_all')}</span>
                  </button>
                )}
                <button
                  onClick={handleBellToggle}
                  className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto max-h-[420px]">
              {loading && visible.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t('loading')}</p>
                </div>
              ) : visible.length === 0 ? (
                <div className="p-8 text-center">
                  <BellIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('no_notifications')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {t('up_to_date')}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-dark-100">
                  <AnimatePresence initial={false}>
                    {visible.map((notification) => {
                      const IconComponent = iconMap[notification.icon] || BellIcon
                      const colorClass    = priorityColors[notification.priority]     || priorityColors.low
                      const iconColorClass = priorityIconColors[notification.priority] || priorityIconColors.low
                      const isDeleting    = deleting === notification.id
                      const isUnseen      = !seen.has(notification.id)

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: isDeleting ? 0.4 : 1, x: 0 }}
                          exit={{ opacity: 0, x: 40, height: 0, paddingTop: 0, paddingBottom: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`group relative px-4 py-3 border-l-4 hover:bg-gray-50 dark:hover:bg-dark-300/50 transition-colors cursor-default ${colorClass} ${
                            !isUnseen ? 'opacity-60' : ''
                          }`}
                        >
                          {/* Blue dot for unseen */}
                          {isUnseen && (
                            <span className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-500" />
                          )}
                          <div className="flex gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColorClass}`}>
                              <IconComponent className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex-1 min-w-0 pr-7">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm leading-tight ${isUnseen ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
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
                          {/* Delete button — visible on hover */}
                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            disabled={isDeleting}
                            title={t('delete')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {visible.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300">
                <button
                  onClick={fetchNotifications}
                  className="w-full text-center text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
                >
                  {t('refresh')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
