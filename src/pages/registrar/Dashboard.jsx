import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bar } from 'react-chartjs-2'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import { useI18n } from '../../i18n/index.jsx'
import { useWidgetSettings } from '../../hooks/useWidgetSettings'
import { UserGroupIcon, UsersIcon, CalendarIcon, PlusCircleIcon, ShieldCheckIcon, CurrencyDollarIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export default function RegistrarDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()
  const showWidget = useWidgetSettings()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await dashboardApi.getRegistrarStats()
      setStats(response.data.data)
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div>
          <div className="h-7 w-52 bg-gray-200 dark:bg-dark-100 rounded-lg mb-2" />
          <div className="h-4 w-64 bg-gray-100 dark:bg-dark-200 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0,1,2,3].map(i => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-28 bg-gray-200 dark:bg-dark-100 rounded" />
                <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-200" />
              </div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-dark-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <div className="h-5 w-40 bg-gray-200 dark:bg-dark-100 rounded mb-4" />
            <div className="h-64 bg-gray-100 dark:bg-dark-200 rounded-xl" />
          </div>
          <div className="card p-6">
            <div className="h-5 w-32 bg-gray-200 dark:bg-dark-100 rounded mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[0,1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-100 dark:bg-dark-200 rounded-xl" />
              ))}
              <div className="col-span-2 sm:col-span-1 h-20 bg-gray-100 dark:bg-dark-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const levelData = {
    labels: stats?.students_by_level?.map((l) => l.level) || [],
    datasets: [{
      label: t('students'),
      data: stats?.students_by_level?.map((l) => l.count) || [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderRadius: 8,
    }],
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t('registrar_dashboard')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('welcome_registrar')}
        </p>
      </motion.div>

      {showWidget('stats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title={t('total_students')} value={stats?.stats?.total_students || 0} icon={UserGroupIcon} color="primary" />
          <StatCard title={t('active_students')} value={stats?.stats?.active_students || 0} icon={UserGroupIcon} color="teal" delay={0.1} />
          <StatCard title={t('total_teachers')} value={stats?.stats?.total_teachers || 0} icon={UsersIcon} color="blue" delay={0.2} />
          <StatCard title={t('new_this_month')} value={stats?.stats?.new_this_month || 0} icon={CalendarIcon} color="orange" delay={0.3} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('students_by_level_registrar')}</h3>
          <div className="h-64">
            <Bar data={levelData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('quick_actions')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/registrar/students" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group">
              <PlusCircleIcon className="w-8 h-8 mx-auto mb-2 text-primary-500 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900 dark:text-white text-sm">{t('add_student')}</p>
            </Link>
            <Link to="/registrar/teachers" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group">
              <UsersIcon className="w-8 h-8 mx-auto mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900 dark:text-white text-sm">{t('add_teacher')}</p>
            </Link>
            <Link to="/registrar/users?role=finance" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group">
              <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 text-green-500 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900 dark:text-white text-sm">{t('add_finance')}</p>
            </Link>
            <Link to="/registrar/users?role=registrar" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group">
              <ClipboardDocumentCheckIcon className="w-8 h-8 mx-auto mb-2 text-orange-500 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900 dark:text-white text-sm">{t('add_registrar')}</p>
            </Link>
            <Link to="/registrar/users?role=admin" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group col-span-2 sm:col-span-1">
              <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2 text-red-500 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900 dark:text-white text-sm">{t('add_admin')}</p>
            </Link>
          </div>
        </motion.div>
      </div>

      {showWidget('new_registrations') && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('recent_registrations')}</h3>
          <div className="space-y-4">
            {stats?.recent_students?.map((student) => (
              <div key={student.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-300">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium">
                  {student.user?.first_name?.[0]}{student.user?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{student.user?.first_name} {student.user?.last_name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{student.department?.name} - {student.level}</p>
                </div>
                <span className="badge badge-info">{student.student_id}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

