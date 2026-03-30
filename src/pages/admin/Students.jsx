import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { studentApi, adminApi, courseApi } from '../../services/api'
import { useI18n } from '../../i18n/index.jsx'
import DataTable from '../../components/DataTable'
import {
  EyeIcon,
  XMarkIcon,
  CheckCircleIcon,
  BookOpenIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowUpCircleIcon,
  AcademicCapIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

const SEMESTER_LABELS = { '1': 'Semestre 1', '2': 'Semestre 2', '3': 'Semestre 3' }

function letterGradeBadgeClass(letter) {
  if (!letter) return 'bg-gray-100 text-gray-600'
  if (letter.startsWith('A')) return 'bg-green-100 text-green-700'
  if (letter.startsWith('B')) return 'bg-blue-100 text-blue-700'
  if (letter.startsWith('C')) return 'bg-yellow-100 text-yellow-700'
  if (letter.startsWith('D')) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

/** Single course row inside a semester table */
function TranscriptCourseRow({ item }) {
  const { course, grade, course_status: status, enrollment } = item
  const isFuture = status === 'not_enrolled'
  const isTransfer = enrollment?.status === 'transfer'
  const teacher = enrollment?.teacher

  const statusIcon = {
    validated:    <CheckCircleIcon    className="w-4 h-4 text-green-500 shrink-0" />,
    enrolled:     <BookOpenIcon       className="w-4 h-4 text-blue-500 shrink-0"  />,
    failed:       <ExclamationCircleIcon className="w-4 h-4 text-red-500 shrink-0" />,
    not_enrolled: <ClockIcon          className="w-4 h-4 text-gray-300 shrink-0"  />,
  }[status]

  return (
    <tr className={`border-b border-gray-100 dark:border-dark-100 ${isFuture ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-dark-100'}`}>
      <td className="py-2 px-3 w-8">{statusIcon}</td>
      <td className="py-2 px-3 text-xs font-mono text-gray-500">{course.code}</td>
      <td className="py-2 px-3 text-sm font-medium text-gray-800 dark:text-gray-200">
        {course.name}
        {isTransfer && (
          <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
            Transféré
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
        {teacher ? (
          <span className="text-primary-600">Prof. {teacher.first_name} {teacher.last_name}</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="py-2 px-3 text-xs text-center text-gray-500 whitespace-nowrap">{course.credits} cr.</td>
      <td className="py-2 px-3 text-xs text-center">
        {grade ? (
          <span className="font-semibold text-gray-700 dark:text-gray-300">{grade.final_grade}%</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="py-2 px-3 text-xs text-center">
        {grade?.letter_grade ? (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${letterGradeBadgeClass(grade.letter_grade)}`}>
            {grade.letter_grade}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  )
}

/** Collapsible semester block inside a year accordion */
function SemesterSection({ sem, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const { stats } = sem

  const headerCls = {
    past:    'bg-gray-50 dark:bg-dark-100 text-gray-700 dark:text-gray-300',
    current: 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
    future:  'bg-gray-50 dark:bg-dark-100 text-gray-400',
  }[sem.status] ?? 'bg-gray-50 dark:bg-dark-100'

  const badgeCls = {
    past:    'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    current: 'bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-100',
    future:  'bg-gray-100 text-gray-400',
  }[sem.status] ?? ''

  const { t } = useI18n()
  const badgeLabel = { past: t('semester_done'), current: t('semester_current'), future: t('semester_upcoming') }[sem.status]

  return (
    <div className="mb-2 border border-gray-100 dark:border-dark-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 py-2.5 px-4 text-left transition-colors ${headerCls}`}
      >
        <span className="font-semibold text-sm">{sem.label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>{badgeLabel}</span>
        <span className="ml-auto text-xs text-gray-400">
          {stats.validated}/{stats.total} validés · {stats.credits_earned}/{stats.credits_total} cr.
        </span>
        <span className="text-xs text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark-100 text-xs text-gray-500 uppercase">
                <th className="py-1.5 px-3 w-8" />
                <th className="py-1.5 px-3">Code</th>
                <th className="py-1.5 px-3">Intitulé</th>
                <th className="py-1.5 px-3">Professeur</th>
                <th className="py-1.5 px-3 text-center">Crédits</th>
                <th className="py-1.5 px-3 text-center">Note</th>
                <th className="py-1.5 px-3 text-center">Mention</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-200">
              {sem.courses.map((item, i) => (
                <TranscriptCourseRow key={item.course?.id ?? i} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Collapsible year accordion shown in the transcript */
function YearSection({ yearData, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const { t } = useI18n()
  const { year, year_label, is_current_year, is_past_year, semesters, year_stats } = yearData

  const headerCls = is_current_year
    ? 'bg-primary-50 dark:bg-primary-900/20'
    : is_past_year
      ? 'bg-green-50 dark:bg-green-900/10'
      : 'bg-gray-50 dark:bg-dark-100'

  const yearLabelCls = is_current_year
    ? 'text-primary-700 dark:text-primary-300'
    : is_past_year
      ? 'text-green-700 dark:text-green-400'
      : 'text-gray-400'

  return (
    <div className="mb-4 border border-gray-200 dark:border-dark-100 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 py-3 px-4 text-left transition-colors ${headerCls}`}
      >
        <span className={`text-base font-bold ${yearLabelCls}`}>{year}</span>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{year_label}</span>

        {is_current_year && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-200 font-medium">
            {t('year_in_progress')}
          </span>
        )}
        {is_past_year && year_stats.is_year_passed && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
            ✓ {t('year_passed')}
          </span>
        )}
        {is_past_year && !year_stats.is_year_passed && year_stats.failed > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
            {t('year_partial')}
          </span>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {year_stats.validated}/{year_stats.total} validés · {year_stats.credits_earned}/{year_stats.credits_total} cr.
        </span>
        <span className="text-xs text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-3 bg-white dark:bg-dark-200 space-y-2">
          {semesters.map((sem) => (
            <SemesterSection
              key={sem.semester}
              sem={sem}
              defaultOpen={sem.status === 'current'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Full transcript modal — Year → Semester → Course hierarchy */
function StudentProfileModal({ studentId, onClose, onPromoted }) {
  const { t } = useI18n()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)
  const [confirmPromote, setConfirmPromote] = useState(false)
  const [autoEnrolling, setAutoEnrolling] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferData, setTransferData] = useState({ course_id: '', final_grade: '', source_school: '' })
  const [transferSubmitting, setTransferSubmitting] = useState(false)
  const [allCourses, setAllCourses] = useState([])

  const loadData = () => {
    setLoading(true)
    adminApi.getStudentDetails(studentId)
      .then(res => setData(res.data))
      .catch(() => toast.error(t('error')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [studentId])

  const UNDERGRADUATE_LEVELS = ['L1', 'L2', 'L3']
  const NEXT_LEVEL = { L1: 'L2', L2: 'L3' }

  const handlePromote = async () => {
    setPromoting(true)
    try {
      const res = await studentApi.promote(studentId)
      toast.success(res.data.message || 'Promotion réussie')
      setConfirmPromote(false)
      loadData()
      onPromoted?.()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de la promotion')
    } finally {
      setPromoting(false)
    }
  }

  const handleAutoEnroll = async () => {
    setAutoEnrolling(true)
    try {
      const res = await studentApi.autoEnroll(studentId)
      toast.success(res.data.message || 'Inscription automatique effectuée')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'inscription automatique')
    } finally {
      setAutoEnrolling(false)
    }
  }

  const openTransferModal = async () => {
    setShowTransferModal(true)
    if (allCourses.length === 0) {
      try {
        const res = await courseApi.getAll({ per_page: 200 })
        setAllCourses(res.data.data.data || res.data.data)
      } catch {
        toast.error('Impossible de charger les cours')
      }
    }
  }

  const handleTransferSubmit = async (e) => {
    e.preventDefault()
    setTransferSubmitting(true)
    try {
      await adminApi.addTransferGrade(studentId, transferData)
      toast.success('Note de transfert ajoutée avec succès')
      setShowTransferModal(false)
      setTransferData({ course_id: '', final_grade: '', source_school: '' })
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'ajout')
    } finally {
      setTransferSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-dark-200 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Chargement du profil académique...</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { student, academic_progress = {}, statistics = {} } = data
  const prog    = academic_progress
  const summary = prog.programme_summary || {}
  const years   = prog.years || []

  // Legend counts derived from the years tree
  const totalValidated   = years.reduce((s, y) => s + (y.year_stats?.validated   ?? 0), 0)
  const totalInProgress  = years.reduce((s, y) => s + (y.year_stats?.in_progress ?? 0), 0)
  const totalFailed      = years.reduce((s, y) => s + (y.year_stats?.failed      ?? 0), 0)

  const isUndergraduate      = UNDERGRADUATE_LEVELS.includes(student.level)
  const isGraduated          = student.status === 'graduated'
  const nextLevel            = NEXT_LEVEL[student.level]
  const isL3Complete         = student.level === 'L3'
  const retakeCourseDetails  = data.retake_course_details ?? []

  return (
    <>
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-dark-200 rounded-2xl shadow-2xl w-full max-w-4xl my-8"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dark-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white text-xl font-bold shadow">
              {student.user?.first_name?.[0]}{student.user?.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">
                {student.user?.first_name} {student.user?.last_name}
              </h2>
              <p className="text-sm text-gray-500">
                {student.student_id} · {student.department?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* ── Transfer grade button ── */}
            <button
              onClick={openTransferModal}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-sm font-medium transition-colors"
              title="Ajouter une note de transfert"
            >
              <ArrowPathIcon className="w-4 h-4" /> Transféré
            </button>
            {/* ── Auto-enroll button (undergraduate, non-graduated only) ── */}
            {isUndergraduate && !isGraduated && (
              <button
                onClick={handleAutoEnroll}
                disabled={autoEnrolling}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-sm font-medium transition-colors disabled:opacity-50"
                title="Inscrire automatiquement aux cours du niveau actuel"
              >
                {autoEnrolling ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <BookOpenIcon className="w-4 h-4" />}
                Inscrire
              </button>
            )}
            {/* ── Promote button (undergraduate, non-graduated only) ── */}
            {isUndergraduate && !isGraduated && (
              <button
                onClick={() => setConfirmPromote(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium transition-colors"
                title={isL3Complete ? 'Finaliser le cursus licence' : `Promouvoir en ${nextLevel}`}
              >
                {isL3Complete
                  ? <><AcademicCapIcon className="w-4 h-4" /> Finaliser L3</>
                  : <><ArrowUpCircleIcon className="w-4 h-4" /> → {nextLevel}</>
                }
              </button>
            )}
            {isGraduated && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold">
                <AcademicCapIcon className="w-4 h-4" /> Cursus licence terminé
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── Promotion confirmation banner ── */}
        <AnimatePresence>
          {confirmPromote && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mx-6 mt-4 p-4 rounded-xl border-2 border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20">
                <p className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-1">
                  {isL3Complete
                    ? `Confirmer la fin du cursus licence pour ${student.user?.first_name} ${student.user?.last_name} ?`
                    : `Promouvoir ${student.user?.first_name} ${student.user?.last_name} de ${student.level} vers ${nextLevel} ?`
                  }
                </p>
                <p className="text-xs text-primary-600 dark:text-primary-400 mb-3">
                  {isL3Complete
                    ? "L'étudiant sera marqué comme ayant terminé le cursus licence. L'inscription en Master doit se faire séparément."
                    : "Les cours échoués ou non évalués seront conservés comme cours à repasser. La promotion est définitive."
                  }
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePromote}
                    disabled={promoting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    {promoting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                    {promoting ? 'En cours...' : 'Confirmer'}
                  </button>
                  <button
                    onClick={() => setConfirmPromote(false)}
                    disabled={promoting}
                    className="px-4 py-1.5 rounded-lg border border-gray-300 dark:border-dark-100 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 space-y-6">
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-primary-50 dark:bg-primary-900/20 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Niveau actuel</p>
              <p className="text-lg font-bold text-primary-600">{prog.current_level}</p>
              <p className="text-xs text-gray-400">{SEMESTER_LABELS[prog.current_semester]}</p>
            </div>
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Cours validés</p>
              <p className="text-lg font-bold text-green-600">{totalValidated}</p>
              <p className="text-xs text-gray-400">/ {summary.total_programme_courses ?? 0}</p>
            </div>
            <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Crédits</p>
              <p className="text-lg font-bold text-blue-600">{summary.credits_earned ?? 0}</p>
              <p className="text-xs text-gray-400">/ {summary.credits_total ?? 0}</p>
            </div>
            <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Avancement</p>
              <p className="text-lg font-bold text-purple-600">{summary.completion_percentage ?? 0}%</p>
              <p className="text-xs text-gray-400">
                Moy.&nbsp;
                {statistics.overall_average != null ? `${statistics.overall_average}%` : '—'}
              </p>
            </div>
          </div>

          {/* ── Progress bar ── */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progression du cursus</span>
              <span>{summary.completion_percentage ?? 0}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-dark-100 rounded-full h-2.5">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-primary-500 to-teal-500 transition-all"
                style={{ width: `${Math.min(100, summary.completion_percentage ?? 0)}%` }}
              />
            </div>
          </div>

          {/* ── Legend ── */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-green-500" />
              {totalValidated} validé{totalValidated !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpenIcon className="w-4 h-4 text-blue-500" />
              {totalInProgress} en cours
            </span>
            {totalFailed > 0 && (
              <span className="flex items-center gap-1.5">
                <ExclamationCircleIcon className="w-4 h-4 text-red-500" />
                {totalFailed} non validé{totalFailed !== 1 ? 's' : ''}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-gray-300" />
              À venir
            </span>
          </div>

          {/* ── Retake courses notice ── */}
          {retakeCourseDetails.length > 0 && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowPathIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                  Cours à repasser ({retakeCourseDetails.length})
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {retakeCourseDetails.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium">
                    <span className="font-mono text-orange-500">{c.code}</span>
                    {c.name}
                    <span className="ml-1 px-1 rounded bg-orange-200 dark:bg-orange-800 text-orange-600 dark:text-orange-400 text-xs">{c.level}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Transcript: Year → Semester → Courses ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              Relevé de notes — Vue par année et semestre
            </h3>
            {years.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Aucun cours trouvé dans le programme de cet étudiant.
              </p>
            ) : (
              years.map((yearData) => (
                <YearSection
                  key={yearData.year}
                  yearData={yearData}
                  defaultOpen={yearData.is_current_year}
                />
              ))
            )}
          </div>
        </div>
      </motion.div>
    </div>

    {/* ── Transfer grade modal ── */}
    <AnimatePresence>
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-dark-200 rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Ajouter une note transférée</h3>
              <button onClick={() => setShowTransferModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100">
                <XMarkIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Enregistre une note historique provenant d'un autre établissement. Le cours apparaîtra dans le relevé avec la mention "Transféré".
            </p>
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="label">Cours</label>
                <select
                  value={transferData.course_id}
                  onChange={e => setTransferData({ ...transferData, course_id: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Sélectionner un cours</option>
                  {allCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.level} — {c.code} · {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Note finale (/100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={transferData.final_grade}
                  onChange={e => setTransferData({ ...transferData, final_grade: e.target.value })}
                  className="input"
                  placeholder="ex. 72.5"
                  required
                />
              </div>
              <div>
                <label className="label">Établissement d'origine <span className="text-gray-400 font-normal">(optionnel)</span></label>
                <input
                  type="text"
                  value={transferData.source_school}
                  onChange={e => setTransferData({ ...transferData, source_school: e.target.value })}
                  className="input"
                  placeholder="ex. Université de Libreville"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowTransferModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" disabled={transferSubmitting} className="btn-primary disabled:opacity-50">
                  {transferSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  )
}

export default function AdminStudents() {
  const { t } = useI18n()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStudentId, setSelectedStudentId] = useState(null)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await studentApi.getAll({ per_page: 100 })
      setStudents(response.data.data.data || response.data.data)
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      header: t('student'),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white font-medium">
            {row.user?.first_name?.[0]}{row.user?.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium">{row.user?.first_name} {row.user?.last_name}</p>
            <p className="text-sm text-gray-500">{row.student_id}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: (row) => row.user?.email,
    },
    {
      header: t('department'),
      accessor: (row) => row.department?.name,
    },
    {
      header: t('level'),
      cell: (row) => <span className="badge badge-info">{row.level}</span>,
    },
    {
      header: t('status'),
      cell: (row) => (
        <span className={`badge ${
          row.status === 'active' ? 'badge-success' :
          row.status === 'graduated' ? 'badge-info' : 'badge-warning'
        }`}>
          {t(row.status) || row.status}
        </span>
      ),
    },
    {
      header: t('enrollment_date'),
      accessor: (row) => row.enrollment_date ? new Date(row.enrollment_date).toLocaleDateString() : '—',
    },
    {
      header: t('profile_title'),
      cell: (row) => (
        <button
          onClick={() => setSelectedStudentId(row.id)}
          className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600"
        >
          <EyeIcon className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          {t('students')}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t('students_subtitle')}
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <DataTable
          columns={columns}
          data={students}
          loading={loading}
          searchPlaceholder={t('search_students')}
        />
      </motion.div>

      <AnimatePresence>
        {selectedStudentId && (
          <StudentProfileModal
            studentId={selectedStudentId}
            onClose={() => setSelectedStudentId(null)}
            onPromoted={fetchStudents}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

