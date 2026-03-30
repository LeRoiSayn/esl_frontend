import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/index.jsx'
import { teacherApi, gradeApi } from '../../services/api'
import { BookOpenIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import api from '../../services/api'

/* Max scores per component */
const WEIGHTS = { attendance_score: 10, quiz_score: 20, continuous_assessment: 30, exam_score: 40 }

function calcFinal(row) {
  const a    = parseFloat(row.attendance_score)      || 0
  const quiz = parseFloat(row.quiz_score)            || 0
  const ca   = parseFloat(row.continuous_assessment) || 0
  const exam = parseFloat(row.exam_score)            || 0
  return a + quiz + ca + exam
}

function letterGrade(score) {
  if (score >= 90) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 80) return 'A-'
  if (score >= 75) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 65) return 'B-'
  if (score >= 60) return 'C+'
  if (score >= 55) return 'C'
  if (score >= 50) return 'C-'
  if (score >= 45) return 'D+'
  if (score >= 40) return 'D'
  return 'F'
}

export default function TeacherGrades() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [classes, setClasses]         = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents]       = useState([])
  const [grades, setGrades]           = useState({})
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)

  useEffect(() => { if (user?.teacher?.id) fetchClasses() }, [user])

  const fetchClasses = async () => {
    try { const res = await teacherApi.getClasses(user.teacher.id); setClasses(res.data.data) }
    catch { toast.error(t('error')) }
    finally { setLoading(false) }
  }

  const fetchStudents = async (classId) => {
    setLoading(true)
    try {
      const res = await gradeApi.getByClass(classId)
      setStudents(res.data.data)
      const map = {}
      res.data.data.forEach(enrollment => {
        const g = enrollment.grades?.[0]
        map[enrollment.id] = {
          attendance_score:      g?.attendance_score      ?? '',
          quiz_score:            g?.quiz_score            ?? '',
          continuous_assessment: g?.continuous_assessment ?? '',
          exam_score:            g?.exam_score            ?? '',
        }
      })
      setGrades(map)
    } catch { toast.error(t('error')) }
    finally { setLoading(false) }
  }

  const handleClassSelect = (cls) => { setSelectedClass(cls); fetchStudents(cls.id) }

  const handleChange = (enrollmentId, field, value) => {
    setGrades(prev => ({ ...prev, [enrollmentId]: { ...prev[enrollmentId], [field]: value } }))
  }

  const handleSubmitToAdmin = async () => {
    if (!selectedClass) return
    setSubmitting(true)
    // Save grades first, then submit to admin
    try {
      const payload = Object.entries(grades)
        .map(([id, data]) => ({
          enrollment_id:          parseInt(id),
          attendance_score:       data.attendance_score      !== '' ? data.attendance_score      : null,
          quiz_score:             data.quiz_score            !== '' ? data.quiz_score            : null,
          continuous_assessment:  data.continuous_assessment !== '' ? data.continuous_assessment : null,
          exam_score:             data.exam_score            !== '' ? data.exam_score            : null,
        }))
        .filter(g => Object.values(g).some((v, i) => i > 0 && v !== null))
      if (payload.length > 0) await gradeApi.bulkUpdate(payload)
    } catch { /* ignore save errors, still attempt submit */ }

    try {
      await api.post(`/grades/submit-class/${selectedClass.id}`)
      toast.success(t('grade_submitted_success'))
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'))
    } finally { setSubmitting(false) }
  }

  if (loading && !selectedClass)
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('gradebook')}</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('gradebook_subtitle')}
        </p>
      </motion.div>

      {!selectedClass ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <button key={cls.id} onClick={() => handleClassSelect(cls)} className="card-hover p-6 text-left">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
                  <BookOpenIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">{cls.course?.name}</h3>
                  <p className="text-sm text-gray-500">{cls.course?.code}</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {cls.enrollments?.filter(e => e.status === 'enrolled').length || 0} {t('students')}
              </p>
            </button>
          ))}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedClass(null)} className="btn-secondary">{t('back_to_list')}</button>
              <div>
                <h2 className="font-semibold">{selectedClass.course?.name}</h2>
                <p className="text-sm text-gray-500">{selectedClass.course?.code} · {t('section_label')} {selectedClass.section}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmitToAdmin}
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
                title={t('submit_grades')}
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {submitting ? t('submitting') : t('submit_grades')}
              </button>
            </div>
          </div>

          {/* Weight summary chips */}
          <div className="flex flex-wrap gap-2 text-xs">
            {[['presence_short','text-purple-600 bg-purple-50','/10'],
              ['quiz','text-blue-600 bg-blue-50','/20'],
              ['cc_short','text-orange-600 bg-orange-50','/30'],
              ['final_exam','text-green-600 bg-green-50','/40']].map(([key, cls, w]) => (
              <span key={key} className={`px-2 py-1 rounded-full font-medium ${cls}`}>{t(key)}: {w}</span>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('student_col')}</th>
                    <th>{t('student_id_col')}</th>
                    <th className="w-28">{t('presence_short')}<br/><span className="font-normal text-xs text-gray-400">/10</span></th>
                    <th className="w-28">{t('quiz')}<br/><span className="font-normal text-xs text-gray-400">/20</span></th>
                    <th className="w-28">{t('cc_short')}<br/><span className="font-normal text-xs text-gray-400">/30</span></th>
                    <th className="w-28">{t('exam')}<br/><span className="font-normal text-xs text-gray-400">/40</span></th>
                    <th className="w-24">{t('total_score_col')}</th>
                    <th className="w-20">{t('mention_col')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(enrollment => {
                    const row    = grades[enrollment.id] || {}
                    const final  = calcFinal(row)
                    const letter = letter => letterGrade(final)
                    const inputCls = 'w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'
                    return (
                      <tr key={enrollment.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                              {enrollment.student?.user?.first_name?.[0]}{enrollment.student?.user?.last_name?.[0]}
                            </div>
                            <span>{enrollment.student?.user?.first_name} {enrollment.student?.user?.last_name}</span>
                          </div>
                        </td>
                        <td className="text-gray-500">{enrollment.student?.student_id}</td>
                        {['attendance_score','quiz_score','continuous_assessment','exam_score'].map((field, idx) => (
                          <td key={field}>
                            <input
                              type="number"
                              value={row[field] ?? ''}
                              onChange={e => handleChange(enrollment.id, field, e.target.value)}
                              className={inputCls}
                              min="0"
                              max={[10, 20, 30, 40][idx]}
                              step="0.5"
                              placeholder="—"
                            />
                          </td>
                        ))}
                        <td className={`font-semibold ${final >= 50 ? 'text-green-600' : final > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {(Object.values(row).some(v => v !== '')) ? final.toFixed(1) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${final >= 50 ? 'badge-success' : final > 0 ? 'badge-danger' : 'badge-info'}`}>
                            {Object.values(row).some(v => v !== '') ? letterGrade(final) : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
