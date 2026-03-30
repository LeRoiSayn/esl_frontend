import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/index.jsx'
import { teacherApi, classApi } from '../../services/api'
import { BookOpenIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function TeacherClasses() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)

  useEffect(() => { if (user?.teacher?.id) fetchClasses() }, [user])

  const fetchClasses = async () => {
    try { const response = await teacherApi.getClasses(user.teacher.id); setClasses(response.data.data) } 
    catch (error) { toast.error(t('error')) } finally { setLoading(false) }
  }

  const openStudents = async (cls) => {
    setSelectedClass(cls)
    setStudentsLoading(true)
    try {
      const response = await classApi.getStudents(cls.id)
      setStudents(response.data.data || [])
    } catch { toast.error(t('error')) } finally { setStudentsLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('my_classes')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('classes_subtitle_teacher')}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls, index) => (
          <motion.div key={cls.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="card-hover p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <BookOpenIcon className="w-6 h-6 text-white" />
              </div>
              <span className="badge badge-info">{cls.section}</span>
            </div>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1">{cls.course?.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{cls.course?.code}</p>
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-dark-100">
              <button
                onClick={() => openStudents(cls)}
                className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
              >
                <UserGroupIcon className="w-4 h-4" />
                {cls.enrollments?.filter(e => e.status === 'enrolled').length || 0} {t('students')}
              </button>
              <span className="text-sm text-gray-500">{cls.room || t('no_room')}</span>
            </div>
          </motion.div>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full text-center py-12">
            <BookOpenIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">{t('no_classes_assigned')}</p>
          </div>
        )}
      </div>

      {/* Students Modal */}
      <AnimatePresence>
        {selectedClass && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-200 dark:border-dark-100 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedClass.course?.name}</h2>
                  <p className="text-sm text-gray-500">{selectedClass.course?.code} • {students.length} {t('students')}</p>
                </div>
                <button onClick={() => setSelectedClass(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto">
                {studentsLoading ? (
                  <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : students.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">{t('no_students_class')}</p>
                ) : (
                  <div className="space-y-3">
                    {students.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-200">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white font-medium text-sm">
                          {enrollment.student?.user?.first_name?.[0]}{enrollment.student?.user?.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {enrollment.student?.user?.first_name} {enrollment.student?.user?.last_name}
                          </p>
                          <p className="text-xs text-gray-500">{enrollment.student?.student_id}</p>
                        </div>
                        <span className={`badge ${enrollment.status === 'enrolled' ? 'badge-success' : 'badge-warning'}`}>
                          {t(enrollment.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

