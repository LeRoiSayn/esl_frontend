import { motion } from 'framer-motion'

export default function StatCard({ title, value, icon: Icon, color = 'default', trend, delay = 0 }) {
  // All icons use the same neutral style — monochrome, professional
  const iconStyle =
    color === 'primary'
      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
      : 'bg-gray-100 text-gray-500 dark:bg-dark-100 dark:text-gray-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
            {value}
          </h3>
          {trend !== undefined && trend !== null && (
            <p className={`text-xs mt-1.5 font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}% vs last month
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconStyle}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}
