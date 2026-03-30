import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { activityLogApi } from '../../services/api'
import DataTable from '../../components/DataTable'
import { ClockIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { useI18n } from '../../i18n/index.jsx'

export default function AdminActivityLog() {
  const { t } = useI18n()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const response = await activityLogApi.getAll({ per_page: 100 })
      setLogs(response.data.data.data || response.data.data)
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'login':
        return 'badge-success'
      case 'logout':
        return 'badge-info'
      case 'create':
        return 'badge-success'
      case 'update':
        return 'badge-warning'
      case 'delete':
        return 'badge-danger'
      default:
        return 'badge-info'
    }
  }

  const columns = [
    {
      header: t('time'),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
          </span>
        </div>
      ),
    },
    {
      header: t('user'),
      cell: (row) => row.user ? (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-medium">
            {row.user.first_name?.[0]}{row.user.last_name?.[0]}
          </div>
          <span>{row.user.first_name} {row.user.last_name}</span>
        </div>
      ) : (
        <span className="text-gray-400">System</span>
      ),
    },
    {
      header: t('action'),
      cell: (row) => (
        <span className={`badge ${getActionColor(row.action)}`}>
          {row.action}
        </span>
      ),
    },
    {
      header: t('description'),
      accessor: 'description',
      cell: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.description || '-'}
        </span>
      ),
    },
    {
      header: t('ip_address'),
      accessor: 'ip_address',
      cell: (row) => (
        <span className="text-sm font-mono text-gray-500">
          {row.ip_address || '-'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t('activity_log')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('activity_log_subtitle')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          searchPlaceholder={t('search_logs')}
          pageSize={20}
        />
      </motion.div>
    </div>
  )
}
