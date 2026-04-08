import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Line, Doughnut } from 'react-chartjs-2'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import { useWidgetSettings } from '../../hooks/useWidgetSettings'
import { useI18n } from '../../i18n/index.jsx'
import { CurrencyDollarIcon, ClockIcon, CalendarIcon, BanknotesIcon } from '@heroicons/react/24/outline'

export default function FinanceDashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const showWidget = useWidgetSettings()

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try { const response = await dashboardApi.getFinanceStats(); setStats(response.data.data) } 
    catch (_) { } finally { setLoading(false) }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 bg-gray-200 dark:bg-dark-100 rounded-lg mb-2" />
        <div className="h-4 w-60 bg-gray-100 dark:bg-dark-200 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[0,1,2,3].map(i => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-28 bg-gray-200 dark:bg-dark-100 rounded" />
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-dark-200" />
            </div>
            <div className="h-8 w-24 bg-gray-200 dark:bg-dark-100 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="h-5 w-36 bg-gray-200 dark:bg-dark-100 rounded mb-4" />
          <div className="h-64 bg-gray-100 dark:bg-dark-200 rounded-xl" />
        </div>
        <div className="card p-6">
          <div className="h-5 w-44 bg-gray-200 dark:bg-dark-100 rounded mb-4" />
          <div className="h-64 bg-gray-100 dark:bg-dark-200 rounded-full mx-auto w-64" />
        </div>
      </div>
      <div className="card p-6">
        <div className="h-5 w-36 bg-gray-200 dark:bg-dark-100 rounded mb-4" />
        <div className="space-y-3">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-100" />
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-dark-100 rounded" />
                  <div className="h-3 w-20 bg-gray-100 dark:bg-dark-200 rounded" />
                </div>
              </div>
              <div className="h-5 w-24 bg-gray-200 dark:bg-dark-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const trendData = {
    labels: stats?.monthly_trends?.map((t) => t.month) || [],
    datasets: [{
      label: 'Revenue',
      data: stats?.monthly_trends?.map((t) => t.total) || [],
      fill: true, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', tension: 0.4,
    }],
  }

  const typeData = {
    labels: stats?.revenue_by_type?.map((t) => t.name) || [],
    datasets: [{
      data: stats?.revenue_by_type?.map((t) => t.total) || [],
      backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(236, 72, 153, 0.8)'],
      borderWidth: 0,
    }],
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('finance_dashboard')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('welcome_finance')}</p>
      </motion.div>

      {showWidget('stats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title={t('total_revenue')} value={formatCurrency(stats?.total_revenue || 0)} icon={CurrencyDollarIcon} color="primary" />
          <StatCard title={t('pending_fees')} value={formatCurrency(stats?.pending_fees || 0)} icon={ClockIcon} color="orange" delay={0.1} />
          <StatCard title={t('todays_collection')} value={formatCurrency(stats?.today_payments || 0)} icon={CalendarIcon} color="blue" delay={0.2} />
          <StatCard title={t('monthly_revenue')} value={formatCurrency(stats?.monthly_revenue || 0)} icon={BanknotesIcon} color="teal" delay={0.3} />
        </div>
      )}

      {showWidget('payments_today') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('revenue_trend')}</h3>
            <div className="h-64"><Line data={trendData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('revenue_by_fee_type')}</h3>
            <div className="h-64 flex items-center justify-center"><Doughnut data={typeData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} /></div>
          </motion.div>
        </div>
      )}

      {showWidget('pending_payments') && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('recent_payments')}</h3>
        <div className="space-y-3">
          {stats?.recent_payments?.slice(0, 5).map((payment) => (
            <div key={payment.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-medium">
                  {payment.student_fee?.student?.user?.first_name?.[0]}{payment.student_fee?.student?.user?.last_name?.[0]}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{payment.student_fee?.student?.user?.first_name} {payment.student_fee?.student?.user?.last_name}</p>
                  <p className="text-sm text-gray-500">{payment.student_fee?.fee_type?.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                <p className="text-xs text-gray-500">{payment.reference_number}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
      )}
    </div>
  )
}
