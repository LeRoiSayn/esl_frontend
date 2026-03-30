import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { dashboardApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import { useI18n } from '../../i18n/index.jsx'
import { useWidgetSettings } from '../../hooks/useWidgetSettings'
import { BookOpenIcon, ChartBarIcon, ClockIcon, CurrencyDollarIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

export default function StudentDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { t } = useI18n()
  const showWidget = useWidgetSettings()

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try { const response = await dashboardApi.getStudentStats(); setStats(response.data.data) }
    catch (_) { } finally { setLoading(false) }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR').format(amount) + ' RWF'

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  const pendingFees = stats?.fees_summary?.pending || 0
  const totalFees = stats?.fees_summary?.total || 0
  const paidAmount = stats?.fees_summary?.paid || 0
  const paymentPercent = totalFees > 0 ? Math.round((paidAmount / totalFees) * 100) : 100
  const daysUntilDue = stats?.fees_summary?.days_until_due ?? null
  // Only show banner when payment is due within 7 days (orange level) or overdue
  const showBanner = pendingFees > 0 && daysUntilDue !== null && daysUntilDue <= 7

  return (
    <div className="space-y-6">
      {/* Payment Status Banner — only shown when due date is within 7 days */}
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 flex items-center gap-4 ${
            daysUntilDue < 0
              ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700'
              : 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700'
          }`}
        >
          <div className={`p-3 rounded-full ${daysUntilDue < 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-orange-100 dark:bg-orange-900/40'}`}>
            <ExclamationTriangleIcon className={`w-7 h-7 ${daysUntilDue < 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold text-lg ${daysUntilDue < 0 ? 'text-red-800 dark:text-red-300' : 'text-orange-800 dark:text-orange-300'}`}>
              {daysUntilDue < 0 ? t('payment_overdue') : t('payment_due_soon')}
            </h3>
            <p className={`text-sm ${daysUntilDue < 0 ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {daysUntilDue < 0
                ? t('remaining_balance_notice').replace('{amount}', formatCurrency(pendingFees))
                : t('payment_due_in_days').replace('{days}', daysUntilDue).replace('{amount}', formatCurrency(pendingFees))
              }
            </p>
            {totalFees > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className={daysUntilDue < 0 ? 'text-red-500' : 'text-orange-500'}>{paymentPercent}% {t('paid_percent')}</span>
                  <span className={daysUntilDue < 0 ? 'text-red-500' : 'text-orange-500'}>{formatCurrency(paidAmount)} / {formatCurrency(totalFees)}</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${daysUntilDue < 0 ? 'bg-red-200 dark:bg-red-900/40' : 'bg-orange-200 dark:bg-orange-900/40'}`}>
                  <div
                    className={`h-full rounded-full transition-all ${daysUntilDue < 0 ? 'bg-red-500' : 'bg-orange-500'}`}
                    style={{ width: `${paymentPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('student_dashboard')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('welcome_student')}</p>
      </motion.div>

      {showWidget('stats') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title={t('enrolled_courses')} value={stats?.enrolled_courses || 0} icon={BookOpenIcon} color="primary" />
          <StatCard title={t('total_credits')} value={stats?.total_credits || 0} icon={ChartBarIcon} color="blue" delay={0.1} />
          <StatCard title={t('attendance_rate')} value={`${stats?.attendance_rate || 0}%`} icon={ClockIcon} color="teal" delay={0.2} />
          <StatCard title={t('pending_fees')} value={formatCurrency(stats?.pending_fees || 0)} icon={CurrencyDollarIcon} color="orange" delay={0.3} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {showWidget('my_courses') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('my_courses_semester')}</h3>
            <div className="space-y-3">
              {stats?.courses?.slice(0, 5).map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-dark-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center">
                      <BookOpenIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{enrollment.class?.course?.name}</p>
                      <p className="text-xs text-gray-500">{enrollment.class?.course?.code}
                        {enrollment.class?.teacher?.user && (
                          <span className="ml-2 text-primary-600">
                            · Prof. {enrollment.class.teacher.user.first_name} {enrollment.class.teacher.user.last_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-info">{enrollment.class?.course?.credits} cr</span>
                </div>
              ))}
              {(!stats?.courses || stats.courses.length === 0) && <p className="text-gray-500 text-center py-4">{t('no_courses_enrolled')}</p>}
            </div>
            <Link to="/student/courses" className="block mt-4 text-center text-primary-600 hover:text-primary-700 font-medium">{t('view_all_courses_link')}</Link>
          </motion.div>
        )}
        {showWidget('grades_summary') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('financial_summary')}</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-gray-50 dark:bg-dark-300">
                <span className="text-gray-600 dark:text-gray-400">{t('total_fees_label')}</span>
                <span className="font-semibold">{formatCurrency(stats?.fees_summary?.total || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                <span className="text-green-600 dark:text-green-400">{t('total_paid_label')}</span>
                <span className="font-semibold text-green-600">{formatCurrency(stats?.fees_summary?.paid || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                <span className="text-red-600 dark:text-red-400">{t('balance_due')}</span>
                <span className="font-semibold text-red-600">{formatCurrency(stats?.fees_summary?.pending || 0)}</span>
              </div>
            </div>
            <Link to="/student/fees" className="block mt-4 text-center text-primary-600 hover:text-primary-700 font-medium">{t('view_fees_link')}</Link>
          </motion.div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('quick_links')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link to="/student/courses" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center"><BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" /><p className="font-medium text-sm">{t('my_courses_link')}</p></Link>
          <Link to="/student/grades" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center"><ChartBarIcon className="w-8 h-8 mx-auto mb-2 text-green-500" /><p className="font-medium text-sm">{t('my_grades_link')}</p></Link>
          <Link to="/student/schedule" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center"><ClockIcon className="w-8 h-8 mx-auto mb-2 text-blue-500" /><p className="font-medium text-sm">{t('schedule_link')}</p></Link>
          <Link to="/student/fees" className="p-4 rounded-xl bg-gray-50 dark:bg-dark-300 hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors text-center"><CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2 text-orange-500" /><p className="font-medium text-sm">{t('fees_link')}</p></Link>
        </div>
      </motion.div>
    </div>
  )
}

