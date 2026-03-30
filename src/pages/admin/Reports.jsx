import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bar, Pie } from 'react-chartjs-2'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import { useI18n } from '../../i18n/index.jsx'
import {
  UserGroupIcon,
  UsersIcon,
  BookOpenIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'

// Generate dynamic colors for any number of items
function generateColors(count) {
  const palette = [
    'rgba(34, 197, 94, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(236, 72, 153, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(20, 184, 166, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(16, 185, 129, 0.8)',
    'rgba(99, 102, 241, 0.8)',
    'rgba(236, 72, 153, 0.8)',
  ]
  return Array.from({ length: count }, (_, i) => palette[i % palette.length])
}

export default function AdminReports() {
  const { t } = useI18n()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const levelData = {
    labels: stats?.students_by_level?.map((l) => l.level) || [],
    datasets: [{
      label: 'Students',
      data: stats?.students_by_level?.map((l) => l.count) || [],
      backgroundColor: generateColors(stats?.students_by_level?.length || 0),
    }],
  }

  const deptData = {
    labels: stats?.students_by_department?.map((d) => d.name) || [],
    datasets: [{
      data: stats?.students_by_department?.map((d) => d.count) || [],
      backgroundColor: generateColors(stats?.students_by_department?.length || 0),
      borderWidth: 0,
    }],
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t('reports')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('reports_subtitle')}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats?.stats?.total_students || 0}
          icon={UserGroupIcon}
          color="primary"
        />
        <StatCard
          title="Active Students"
          value={stats?.stats?.active_students || 0}
          icon={UserGroupIcon}
          color="teal"
          delay={0.1}
        />
        <StatCard
          title="Total Teachers"
          value={stats?.stats?.total_teachers || 0}
          icon={UsersIcon}
          color="blue"
          delay={0.2}
        />
        <StatCard
          title="Active Teachers"
          value={stats?.stats?.active_teachers || 0}
          icon={UsersIcon}
          color="purple"
          delay={0.3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('students_by_level')}
          </h3>
          <div className="h-64">
            <Bar
              data={levelData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('students_by_department')}
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Pie
              data={deptData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <BookOpenIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Academic Overview</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-100">
              <span className="text-gray-500">Total Courses</span>
              <span className="font-medium">{stats?.stats?.total_courses || 0}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-100">
              <span className="text-gray-500">Total Departments</span>
              <span className="font-medium">{stats?.stats?.total_departments || 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Total Faculties</span>
              <span className="font-medium">{stats?.stats?.total_faculties || 0}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Quick Stats</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-100">
              <span className="text-gray-500">Student/Teacher Ratio</span>
              <span className="font-medium">
                {stats?.stats?.total_teachers > 0 
                  ? Math.round(stats?.stats?.total_students / stats?.stats?.total_teachers) 
                  : 0}:1
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-100">
              <span className="text-gray-500">Avg Students/Department</span>
              <span className="font-medium">
                {stats?.stats?.total_departments > 0 
                  ? Math.round(stats?.stats?.total_students / stats?.stats?.total_departments) 
                  : 0}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Avg Courses/Department</span>
              <span className="font-medium">
                {stats?.stats?.total_departments > 0 
                  ? Math.round(stats?.stats?.total_courses / stats?.stats?.total_departments) 
                  : 0}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
