import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HomeIcon } from '@heroicons/react/24/outline'
import { useI18n } from '../i18n/index.jsx'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-400 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-9xl font-display font-bold text-gradient mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('page_not_found')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
        </p>
        <Link
          to="/login"
          className="btn-primary inline-flex items-center gap-2"
        >
          <HomeIcon className="w-5 h-5" />
          {t('go_home')}
        </Link>
      </motion.div>
    </div>
  )
}
