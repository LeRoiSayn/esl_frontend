import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import { useI18n } from '../../i18n/index.jsx'
import { useWidgetSettings } from '../../hooks/useWidgetSettings'
import { BookOpenIcon, UserGroupIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export default function TeacherDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()
  const showWidget = useWidgetSettings()

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try { const response = await dashboardApi.getTeacherStats(); setStats(response.data.data) } 
    catch (_) { } finally { setLoading(false) }
  }

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-44 bg-gray-200 dark:bg-dark-100 rounded-lg mb-2" />
        <div className="h-4 w-56 bg-gray-100 dark:bg-dark-200 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0,1,2].map(i => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-24 bg-gray-200 dark:bg-dark-100 rounded" />
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-200" />
            </div>
            <div className="h-8 w-12 bg-gray-200 dark:bg-dark-100 rounded" />
          </div>
        ))}
      </div>
      <div className="card p-6">
        <div className="h-5 w-28 bg-gray-200 dark:bg-dark-100 rounded mb-4" />
        <div className="space-y-4">
          {[0,1,2].map(i => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-dark-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-dark-100" />
                <div className="space-y-1">
                  <div className="h-4 w-40 bg-gray-200 dark:bg-dark-100 rounded" />
                  <div className="h-3 w-28 bg-gray-100 dark:bg-dark-200 rounded" />
                </div>
              </div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-dark-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('teacher_dashboard')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('welcome_teacher')}</p>
      </motion.div>

      {showWidget('stats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title={t('my_classes')} value={stats?.total_classes || 0} icon={BookOpenIcon} color="purple" />
          <StatCard title={t('total_students')} value={stats?.total_students || 0} icon={UserGroupIcon} color="blue" delay={0.1} />
          <StatCard title={t('this_semester')} value="2025-2026 / S1" icon={CalendarIcon} color="teal" delay={0.2} />
        </div>
      )}

      {showWidget('my_classes') && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('my_classes')}</h3>
        <div className="space-y-4">
          {stats?.classes?.map((cls) => (
            <div key={cls.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-dark-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <BookOpenIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{cls.course?.name}</p>
                  <p className="text-sm text-gray-500">{cls.course?.code} - {t('section_label')} {cls.section}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {cls.enrolled_students_count ??
                    (cls.enrollments?.filter((e) => e.status === 'enrolled') ?? []).length}{' '}
                  {t('students')}
                </p>
                <p className="text-sm text-gray-500">{t('room')}: {cls.room || t('tbd')}</p>
              </div>
            </div>
          ))}
          {(!stats?.classes || stats.classes.length === 0) && (
            <p className="text-center text-gray-500 py-8">{t('no_classes_assigned')}</p>
          )}
        </div>
      </motion.div>
      )}

      {showWidget('quick_actions') && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('quick_actions')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link to="/teacher/classes" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center">
            <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="font-medium text-sm">{t('view_classes')}</p>
          </Link>
          <Link to="/teacher/grades" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="font-medium text-sm">{t('enter_grades')}</p>
          </Link>
          <Link to="/teacher/attendance" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center">
            <svg className="w-8 h-8 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="font-medium text-sm">{t('take_attendance')}</p>
          </Link>
          <Link to="/teacher/schedule" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center">
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <p className="font-medium text-sm">{t('my_schedule')}</p>
          </Link>
        </div>
      </motion.div>
      )}
    </div>
  )
}

