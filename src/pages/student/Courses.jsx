import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { studentApi } from '../../services/api'
import { BookOpenIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline'
import { useI18n } from '../../i18n/index.jsx'

export default function StudentCourses() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user?.student?.id) fetchCourses() }, [user])

  const fetchCourses = async () => {
    try { const response = await studentApi.getCourses(user.student.id); setCourses(response.data.data) } 
    catch (error) { toast.error(t('error')) } finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">My Courses</h1>
        <p className="text-gray-500 dark:text-gray-400">Courses you are enrolled in this semester</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((enrollment, index) => (
          <motion.div key={enrollment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="card-hover p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center"><BookOpenIcon className="w-6 h-6 text-white" /></div>
              <span className="badge badge-info">{enrollment.class?.course?.credits} credits</span>
            </div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">{enrollment.class?.course?.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{enrollment.class?.course?.code} - Section {enrollment.class?.section}</p>
            {enrollment.class?.teacher && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <UserIcon className="w-4 h-4" />
                <span>{enrollment.class.teacher.user?.first_name} {enrollment.class.teacher.user?.last_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <ClockIcon className="w-4 h-4" />
              <span>{enrollment.class?.course?.hours_per_week || 3} hours/week</span>
            </div>
          </motion.div>
        ))}
        {courses.length === 0 && (
          <div className="col-span-full text-center py-12">
            <BookOpenIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No courses enrolled yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
