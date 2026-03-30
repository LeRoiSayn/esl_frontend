import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { studentApi } from '../../services/api'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { useI18n } from '../../i18n/index.jsx'

export default function StudentAttendance() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user?.student?.id) fetchAttendance() }, [user])

  const fetchAttendance = async () => {
    try { const response = await studentApi.getAttendance(user.student.id); setEnrollments(response.data.data) } 
    catch (error) { toast.error(t('error')) } finally { setLoading(false) }
  }

  const getStatusBadge = (status) => {
    const styles = { present: 'badge-success', absent: 'badge-danger', late: 'badge-warning', excused: 'badge-info' }
    return <span className={`badge ${styles[status]}`}>{status}</span>
  }

  const calculateRate = (attendance) => {
    if (!attendance || attendance.length === 0) return 0
    const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length
    return Math.round((present / attendance.length) * 100)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">My Attendance</h1>
        <p className="text-gray-500 dark:text-gray-400">View your attendance records</p>
      </motion.div>

      <div className="space-y-6">
        {enrollments.map((enrollment, index) => {
          const rate = calculateRate(enrollment.attendance)
          return (
            <motion.div key={enrollment.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"><ClipboardDocumentListIcon className="w-6 h-6 text-white" /></div>
                  <div><h3 className="font-semibold text-gray-900 dark:text-white">{enrollment.class?.course?.name}</h3><p className="text-sm text-gray-500">{enrollment.class?.course?.code}</p></div>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${rate >= 75 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{rate}%</p>
                  <p className="text-sm text-gray-500">Attendance Rate</p>
                </div>
              </div>
              
              {enrollment.attendance && enrollment.attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
                    <tbody>
                      {enrollment.attendance.slice(0, 10).map((att) => (
                        <tr key={att.id}>
                          <td>{new Date(att.date).toLocaleDateString()}</td>
                          <td>{getStatusBadge(att.status)}</td>
                          <td className="text-gray-500">{att.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No attendance records yet</p>
              )}
            </motion.div>
          )
        })}
        {enrollments.length === 0 && (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No attendance records found</p>
          </div>
        )}
      </div>
    </div>
  )
}
