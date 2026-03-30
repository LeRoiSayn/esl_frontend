import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/index.jsx'
import { teacherApi, attendanceApi } from '../../services/api'
import { BookOpenIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

export default function TeacherAttendance() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user?.teacher?.id) fetchClasses() }, [user])

  const fetchClasses = async () => {
    try { const response = await teacherApi.getClasses(user.teacher.id); setClasses(response.data.data) } 
    catch (error) { toast.error(t('error')) } finally { setLoading(false) }
  }

  const fetchAttendance = async (classId, selectedDate) => {
    setLoading(true)
    try {
      const response = await attendanceApi.getByClass(classId, selectedDate)
      setStudents(response.data.data)
      const attMap = {}
      response.data.data.forEach(item => { attMap[item.enrollment_id] = item.attendance?.status || 'present' })
      setAttendance(attMap)
    } catch (error) { toast.error(t('error')) } finally { setLoading(false) }
  }

  const handleClassSelect = (cls) => { setSelectedClass(cls); fetchAttendance(cls.id, date) }
  const handleDateChange = (newDate) => { setDate(newDate); if (selectedClass) fetchAttendance(selectedClass.id, newDate) }
  const handleAttendanceChange = (enrollmentId, status) => { setAttendance(prev => ({ ...prev, [enrollmentId]: status })) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const attendanceData = Object.entries(attendance).map(([enrollmentId, status]) => ({ enrollment_id: parseInt(enrollmentId), status }))
      await attendanceApi.bulkMark(selectedClass.id, date, attendanceData)
      toast.success(t('attendance_saved'))
    } catch (error) { toast.error(t('error')) } finally { setSaving(false) }
  }

  const statusLabels = {
    present: t('attendance_present'),
    absent: t('attendance_absent'),
    late: t('attendance_late'),
    excused: t('attendance_excused'),
  }

  const getStatusColor = (status) => { const colors = { present: 'bg-green-500', absent: 'bg-red-500', late: 'bg-yellow-500', excused: 'bg-blue-500' }; return colors[status] || 'bg-gray-500' }

  if (loading && !selectedClass) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('attendance')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('attendance_subtitle')}</p>
      </motion.div>

      {!selectedClass ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <button key={cls.id} onClick={() => handleClassSelect(cls)} className="card-hover p-6 text-left">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><BookOpenIcon className="w-6 h-6 text-white" /></div>
                <div><h3 className="font-semibold">{cls.course?.name}</h3><p className="text-sm text-gray-500">{cls.course?.code}</p></div>
              </div>
            </button>
          ))}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedClass(null)} className="btn-secondary">{t('back')}</button>
              <div><h2 className="font-semibold">{selectedClass.course?.name}</h2><p className="text-sm text-gray-500">{selectedClass.course?.code}</p></div>
            </div>
            <div className="flex items-center gap-4">
              <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className="input w-auto" />
              <button onClick={handleSave} disabled={saving} className="btn-primary"><CheckCircleIcon className="w-5 h-5 mr-2" />{saving ? t('saving') : t('save')}</button>
            </div>
          </div>

          <div className="card p-6">
            <div className="space-y-4">
              {students.map((item) => (
                <div key={item.enrollment_id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-dark-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white font-medium">{item.student?.user?.first_name?.[0]}{item.student?.user?.last_name?.[0]}</div>
                    <div><p className="font-medium">{item.student?.user?.first_name} {item.student?.user?.last_name}</p><p className="text-sm text-gray-500">{item.student?.student_id}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    {['present', 'absent', 'late', 'excused'].map((status) => (
                      <button key={status} onClick={() => handleAttendanceChange(item.enrollment_id, status)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${attendance[item.enrollment_id] === status ? `${getStatusColor(status)} text-white` : 'bg-gray-200 dark:bg-dark-100 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-dark-200'}`}>
                        {statusLabels[status]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {students.length === 0 && <p className="text-center text-gray-500 py-8">{t('no_students_class')}</p>}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

