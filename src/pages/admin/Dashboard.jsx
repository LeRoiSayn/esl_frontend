import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import { useI18n } from '../../i18n/index.jsx'
import { useWidgetSettings } from '../../hooks/useWidgetSettings'
import {
  UserGroupIcon,
  UsersIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function AdminDashboard() {
  const { t } = useI18n()
  const showWidget = useWidgetSettings()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await dashboardApi.getAdminStats()
      setStats(response.data.data)
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  const enrollmentChartData = {
    labels: stats?.enrollment_trends?.map((t) => t.month) || [],
    datasets: [
      {
        label: 'New Students',
        data: stats?.enrollment_trends?.map((t) => t.count) || [],
        fill: true,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  }

  const departmentChartData = {
    labels: stats?.students_by_department?.map((d) => d.name) || [],
    datasets: [
      {
        data: stats?.students_by_department?.map((d) => d.count) || [],
        backgroundColor: (() => {
          const palette = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444', '#f97316', '#eab308', '#10b981', '#6366f1', '#a855f7']
          const n = stats?.students_by_department?.length || 0
          return Array.from({ length: n }, (_, i) => palette[i % palette.length])
        })(),
        borderWidth: 0,
      },
    ],
  }

  const levelChartData = {
    labels: stats?.students_by_level?.map((l) => l.level) || [],
    datasets: [
      {
        label: 'Students',
        data: stats?.students_by_level?.map((l) => l.count) || [],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 8,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        beginAtZero: true,
      },
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t('dashboard')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('welcome_admin')}
        </p>
      </motion.div>

      {/* Stats Grid */}
      {showWidget('stats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title={t('total_students')} value={stats?.stats?.total_students || 0} icon={UserGroupIcon} color="primary" delay={0} />
          <StatCard title={t('total_teachers')} value={stats?.stats?.total_teachers || 0} icon={UsersIcon} color="blue" delay={0.1} />
          <StatCard title={t('total_courses')} value={stats?.stats?.total_courses || 0} icon={BookOpenIcon} color="purple" delay={0.2} />
          <StatCard title={t('total_departments')} value={stats?.stats?.total_departments || 0} icon={BuildingLibraryIcon} color="orange" delay={0.3} />
        </div>
      )}

      {/* Charts Grid */}
      {showWidget('recent_activity') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('enrollment_trends')}</h3>
            <div className="h-64"><Line data={enrollmentChartData} options={chartOptions} /></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('students_by_department')}</h3>
            <div className="h-64 flex items-center justify-center">
              <Doughnut data={departmentChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </motion.div>
        </div>
      )}

      {showWidget('recent_activity') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('students_by_level')}</h3>
            <div className="h-64"><Bar data={levelChartData} options={chartOptions} /></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('recent_students')}</h3>
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
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Actions */}
      {showWidget('quick_actions') && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <a
            href="/admin/student-management"
            className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group"
          >
            <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-primary-500 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-gray-900 dark:text-white">View Students</p>
          </a>
          <a
            href="/admin/teacher-management"
            className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group"
          >
            <UsersIcon className="w-8 h-8 mx-auto mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-gray-900 dark:text-white">View Teachers</p>
          </a>
          <a
            href="/admin/courses"
            className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group"
          >
            <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-purple-500 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-gray-900 dark:text-white">Manage Courses</p>
          </a>
          <a
            href="/admin/enrollment"
            className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center group"
          >
            <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-orange-500 group-hover:scale-110 transition-transform" />
            <p className="font-medium text-gray-900 dark:text-white">Auto Enroll</p>
          </a>
        </div>
      </motion.div>
      )}
    </div>
  )
}
