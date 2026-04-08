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
  DocumentTextIcon,
  PrinterIcon,
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
  // (report menu state removed — buttons are direct)

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

  const escHtml = (val) =>
    String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  const handleAcademicReport = () => {
    const student = data.student
    const prog = data.academic_progress || {}
    const years = prog.years || []
    const summary = prog.programme_summary || {}
    const stats = data.statistics || {}
    const studentName = `${escHtml(student.user?.first_name)} ${escHtml(student.user?.last_name)}`
    const printDate = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

    const getMention = (n20) => {
      if (n20 >= 16) return 'Très Bien'
      if (n20 >= 14) return 'Bien'
      if (n20 >= 12) return 'Assez Bien'
      if (n20 >= 10) return 'Passable'
      return 'Insuffisant'
    }

    let yearsHtml = ''
    years.forEach(yearData => {
      const yColor = yearData.is_current_year ? '#1d4ed8' : yearData.is_past_year ? '#15803d' : '#6b7280'
      const yBg = yearData.is_current_year ? '#eff6ff' : yearData.is_past_year ? '#f0fdf4' : '#f9fafb'
      let semsHtml = ''
      ;(yearData.semesters || []).forEach(sem => {
        const sColor = sem.status === 'current' ? '#2563eb' : sem.status === 'past' ? '#16a34a' : '#9ca3af'
        const sLabel = sem.status === 'current' ? 'En cours' : sem.status === 'past' ? 'Terminé' : 'À venir'
        const stColors = { validated: '#16a34a', enrolled: '#2563eb', failed: '#dc2626', not_enrolled: '#9ca3af' }
        const stLabels = { validated: 'Validé', enrolled: 'En cours', failed: 'Non validé', not_enrolled: 'Non inscrit' }
        const rows = (sem.courses || []).map(item => {
          const { course, grade, course_status: st, enrollment } = item
          const teacher = enrollment?.teacher
          const teacherName = teacher ? `${escHtml(teacher.first_name)} ${escHtml(teacher.last_name)}` : '—'
          const n100 = grade?.final_grade != null ? parseFloat(grade.final_grade) : null
          const n20 = n100 != null ? (n100 / 5).toFixed(1) : null
          const mention = n20 != null ? getMention(parseFloat(n20)) : '—'
          const rowStyle = st === 'not_enrolled' ? 'color:#9ca3af;font-style:italic;' : ''
          return `<tr style="border-bottom:1px solid #e5e7eb;${rowStyle}">
            <td style="padding:5px 8px;font-size:11px;font-family:monospace;">${escHtml(course?.code) || '—'}</td>
            <td style="padding:5px 8px;font-size:12px;">${escHtml(course?.name) || '—'}</td>
            <td style="padding:5px 8px;font-size:11px;text-align:center;">${escHtml(course?.credits) || '—'}</td>
            <td style="padding:5px 8px;font-size:11px;">${teacherName}</td>
            <td style="padding:5px 8px;font-size:12px;text-align:center;font-weight:600;">${n100 != null ? n100 + '%' : '—'}</td>
            <td style="padding:5px 8px;font-size:12px;text-align:center;font-weight:600;">${n20 != null ? n20 + '/20' : '—'}</td>
            <td style="padding:5px 8px;font-size:11px;text-align:center;">${n20 != null ? escHtml(mention) : '—'}</td>
            <td style="padding:5px 8px;font-size:11px;text-align:center;color:${stColors[st] || '#9ca3af'};font-weight:600;">${stLabels[st] || escHtml(st)}</td>
          </tr>`
        }).join('')
        semsHtml += `<div style="margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;background:#f8fafc;padding:7px 10px;border-radius:6px;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:600;color:#374151;">${escHtml(sem.label)}</span>
            <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:${sColor}20;color:${sColor};font-weight:600;">${sLabel}</span>
            <span style="font-size:10px;color:#9ca3af;margin-left:auto;">${sem.stats?.validated || 0}/${sem.stats?.total || 0} validés · ${sem.stats?.credits_earned || 0}/${sem.stats?.credits_total || 0} cr.</span>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead><tr style="background:#f1f5f9;font-size:10px;color:#6b7280;text-transform:uppercase;">
              <th style="padding:5px 8px;text-align:left;">Code</th>
              <th style="padding:5px 8px;text-align:left;">Intitulé</th>
              <th style="padding:5px 8px;text-align:center;">Crédits</th>
              <th style="padding:5px 8px;text-align:left;">Professeur</th>
              <th style="padding:5px 8px;text-align:center;">Note/100</th>
              <th style="padding:5px 8px;text-align:center;">/20</th>
              <th style="padding:5px 8px;text-align:center;">Mention</th>
              <th style="padding:5px 8px;text-align:center;">Statut</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
      })
      yearsHtml += `<div style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <div style="background:${yBg};padding:10px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e5e7eb;">
          <span style="font-size:14px;font-weight:700;color:${yColor};">${escHtml(yearData.year)}</span>
          <span style="font-size:13px;font-weight:600;color:#374151;">${escHtml(yearData.year_label)}</span>
          <span style="font-size:10px;color:#9ca3af;margin-left:auto;">${yearData.year_stats?.validated || 0}/${yearData.year_stats?.total || 0} validés · ${yearData.year_stats?.credits_earned || 0}/${yearData.year_stats?.credits_total || 0} cr.</span>
        </div>
        <div style="padding:14px;">${semsHtml}</div>
      </div>`
    })

    const totalValidated = years.reduce((s, y) => s + (y.year_stats?.validated ?? 0), 0)
    const overallAvg = stats.overall_average != null ? (stats.overall_average / 5).toFixed(1) : null

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Rapport Académique — ${studentName}</title>
<style>
  @page { margin: 15mm; size: A4; }
  @media print { .no-print { display:none !important; } }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#1f2937; background:#fff; }
</style>
</head><body style="padding:20px;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #0f766e;padding-bottom:14px;margin-bottom:18px;">
  <div>
    <h1 style="font-size:18px;font-weight:700;color:#0f766e;margin-bottom:3px;">École de Santé de Libreville</h1>
    <h2 style="font-size:15px;font-weight:600;color:#374151;">Rapport Académique — Parcours Complet</h2>
  </div>
  <div style="text-align:right;font-size:11px;color:#6b7280;"><p>Imprimé le ${escHtml(printDate)}</p></div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;">
  <div style="background:#f8fafc;border-radius:8px;padding:12px;">
    <p style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Étudiant</p>
    <p style="font-size:16px;font-weight:700;color:#111827;margin-bottom:2px;">${studentName}</p>
    <p style="font-size:12px;color:#6b7280;">${escHtml(student.student_id)} · ${escHtml(student.level) || '—'}</p>
    <p style="font-size:12px;color:#6b7280;">${escHtml(student.department?.name) || '—'}</p>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
    <div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;">
      <p style="font-size:10px;color:#6b7280;margin-bottom:4px;">Validés</p>
      <p style="font-size:18px;font-weight:700;color:#16a34a;">${totalValidated}</p>
      <p style="font-size:10px;color:#9ca3af;">/ ${summary.total_programme_courses || 0}</p>
    </div>
    <div style="background:#eff6ff;border-radius:8px;padding:10px;text-align:center;">
      <p style="font-size:10px;color:#6b7280;margin-bottom:4px;">Crédits</p>
      <p style="font-size:18px;font-weight:700;color:#2563eb;">${summary.credits_earned || 0}</p>
      <p style="font-size:10px;color:#9ca3af;">/ ${summary.credits_total || 0}</p>
    </div>
    <div style="background:#faf5ff;border-radius:8px;padding:10px;text-align:center;">
      <p style="font-size:10px;color:#6b7280;margin-bottom:4px;">Moyenne</p>
      <p style="font-size:18px;font-weight:700;color:#7c3aed;">${overallAvg != null ? overallAvg : '—'}</p>
      <p style="font-size:10px;color:#9ca3af;">/20</p>
    </div>
  </div>
</div>
${yearsHtml}
<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;font-size:10px;color:#9ca3af;">
  Document généré automatiquement · École de Santé de Libreville · ${printDate}
</div>
</body></html>`

    try {
      const key = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(`esl_report:${key}`, JSON.stringify({ html, createdAt: Date.now() }))
      const url = `${window.location.origin}/report-viewer?key=${encodeURIComponent(key)}`
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) toast.error(t('popup_blocked'))
    } catch {
      toast.error(t('error'))
    }
  }

  const handleFinancialReport = () => {
    const student = data.student
    const feesDetail = data.fees_detail || []
    const studentName = `${escHtml(student.user?.first_name)} ${escHtml(student.user?.last_name)}`
    const printDate = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

    const fmt = (amount) => new Intl.NumberFormat('fr-FR').format(amount || 0) + ' RWF'
    const totalAmount = feesDetail.reduce((s, f) => s + parseFloat(f.amount || 0), 0)
    const totalPaid = feesDetail.reduce((s, f) => s + parseFloat(f.paid_amount || 0), 0)
    const totalBalance = totalAmount - totalPaid

    const allPayments = feesDetail
      .flatMap(f => (f.payments || []).map(p => ({ ...p, fee_type_name: f.fee_type?.name || '—' })))
      .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))

    const regFees = feesDetail.filter(f => f.fee_type?.category === 'registration')
    const tuitionFees = feesDetail.filter(f => f.fee_type?.category !== 'registration')
    const tuitionByYear = {}
    tuitionFees.forEach(f => {
      const yr = f.academic_year || 'N/A'
      if (!tuitionByYear[yr]) tuitionByYear[yr] = []
      tuitionByYear[yr].push(f)
    })

    const statusLabel = (s) => s === 'paid' ? 'Payé' : s === 'partial' ? 'Partiel' : s === 'overdue' ? 'En retard' : 'Impayé'
    const statusColor = (s) => s === 'paid' ? '#16a34a' : s === 'partial' ? '#d97706' : s === 'overdue' ? '#dc2626' : '#9ca3af'

    const feeTableHead = `<table style="width:100%;border-collapse:collapse;margin-top:6px;">
      <thead><tr style="background:#f1f5f9;font-size:10px;color:#6b7280;text-transform:uppercase;">
        <th style="padding:5px 8px;text-align:left;">Type de frais</th>
        <th style="padding:5px 8px;text-align:right;">Montant</th>
        <th style="padding:5px 8px;text-align:right;">Payé</th>
        <th style="padding:5px 8px;text-align:right;">Solde</th>
        <th style="padding:5px 8px;text-align:center;">Statut</th>
        <th style="padding:5px 8px;text-align:center;">Échéance</th>
      </tr></thead><tbody>`

    const feeRow = (f, i) => `<tr style="border-bottom:1px solid #e5e7eb;${i % 2 !== 0 ? 'background:#f9fafb;' : ''}">
      <td style="padding:6px 8px;font-size:12px;">${escHtml(f.fee_type?.name) || '—'}</td>
      <td style="padding:6px 8px;font-size:12px;text-align:right;">${fmt(f.amount)}</td>
      <td style="padding:6px 8px;font-size:12px;text-align:right;color:#16a34a;font-weight:600;">${fmt(f.paid_amount)}</td>
      <td style="padding:6px 8px;font-size:12px;text-align:right;color:${f.balance > 0 ? '#dc2626' : '#16a34a'};font-weight:600;">${fmt(f.balance)}</td>
      <td style="padding:6px 8px;font-size:11px;text-align:center;color:${statusColor(f.status)};font-weight:600;">${statusLabel(f.status)}</td>
      <td style="padding:6px 8px;font-size:11px;text-align:center;color:#6b7280;">${f.due_date ? new Date(f.due_date).toLocaleDateString('fr-FR') : '—'}</td>
    </tr>`

    const regSection = regFees.length > 0 ? `<div style="margin-bottom:20px;">
      <h3 style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;padding-left:4px;border-left:3px solid #7c3aed;">Frais d'inscription</h3>
      ${feeTableHead}${regFees.map((f, i) => feeRow(f, i)).join('')}</tbody></table>
    </div>` : ''

    const tuitionSection = Object.keys(tuitionByYear).sort((a, b) => b.localeCompare(a)).map(yr => `
      <div style="margin-bottom:20px;">
        <h3 style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;padding-left:4px;border-left:3px solid #0f766e;">Frais de scolarité — Année ${escHtml(yr)}</h3>
        ${feeTableHead}${tuitionByYear[yr].map((f, i) => feeRow(f, i)).join('')}</tbody></table>
      </div>`).join('')

    const paymentRows = allPayments.map((p, i) => `<tr style="border-bottom:1px solid #e5e7eb;${i % 2 !== 0 ? 'background:#f9fafb;' : ''}">
      <td style="padding:6px 8px;font-size:12px;">${p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : '—'}</td>
      <td style="padding:6px 8px;font-size:11px;font-family:monospace;">${escHtml(p.reference_number) || '—'}</td>
      <td style="padding:6px 8px;font-size:12px;">${escHtml(p.fee_type_name)}</td>
      <td style="padding:6px 8px;font-size:12px;">${escHtml(p.payment_method) || '—'}</td>
      <td style="padding:6px 8px;font-size:12px;text-align:right;font-weight:600;color:#16a34a;">${fmt(p.amount)}</td>
    </tr>`).join('')

    const paymentsSection = allPayments.length > 0 ? `<div style="margin-bottom:20px;">
      <h3 style="font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;padding-left:4px;border-left:3px solid #2563eb;">Historique des paiements</h3>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f1f5f9;font-size:10px;color:#6b7280;text-transform:uppercase;">
          <th style="padding:5px 8px;text-align:left;">Date</th>
          <th style="padding:5px 8px;text-align:left;">Référence</th>
          <th style="padding:5px 8px;text-align:left;">Type de frais</th>
          <th style="padding:5px 8px;text-align:left;">Méthode</th>
          <th style="padding:5px 8px;text-align:right;">Montant</th>
        </tr></thead>
        <tbody>${paymentRows}</tbody>
      </table>
    </div>` : '<p style="color:#9ca3af;font-size:12px;text-align:center;padding:20px 0;">Aucun paiement enregistré.</p>'

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Rapport Financier — ${studentName}</title>
<style>
  @page { margin: 15mm; size: A4; }
  @media print { .no-print { display:none !important; } }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#1f2937; background:#fff; }
</style>
</head><body style="padding:20px;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #0f766e;padding-bottom:14px;margin-bottom:18px;">
  <div>
    <h1 style="font-size:18px;font-weight:700;color:#0f766e;margin-bottom:3px;">École de Santé de Libreville</h1>
    <h2 style="font-size:15px;font-weight:600;color:#374151;">Rapport Financier — Bilan des Frais</h2>
  </div>
  <div style="text-align:right;font-size:11px;color:#6b7280;">
    <p>Imprimé le ${printDate}</p>
    <p style="margin-top:2px;font-weight:600;color:#dc2626;">CONFIDENTIEL</p>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px;">
  <div style="background:#f8fafc;border-radius:8px;padding:12px;">
    <p style="font-size:11px;color:#6b7280;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Étudiant</p>
    <p style="font-size:16px;font-weight:700;color:#111827;margin-bottom:2px;">${studentName}</p>
    <p style="font-size:12px;color:#6b7280;">${escHtml(student.student_id)} · ${escHtml(student.level) || '—'}</p>
    <p style="font-size:12px;color:#6b7280;">${escHtml(student.department?.name) || '—'}</p>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
    <div style="background:#f8fafc;border-radius:8px;padding:10px;text-align:center;border:1px solid #e5e7eb;">
      <p style="font-size:10px;color:#6b7280;margin-bottom:4px;">Total frais</p>
      <p style="font-size:13px;font-weight:700;color:#1f2937;">${fmt(totalAmount)}</p>
    </div>
    <div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;border:1px solid #bbf7d0;">
      <p style="font-size:10px;color:#6b7280;margin-bottom:4px;">Total payé</p>
      <p style="font-size:13px;font-weight:700;color:#16a34a;">${fmt(totalPaid)}</p>
    </div>
    <div style="background:${totalBalance > 0 ? '#fef2f2' : '#f0fdf4'};border-radius:8px;padding:10px;text-align:center;border:1px solid ${totalBalance > 0 ? '#fecaca' : '#bbf7d0'};">
      <p style="font-size:10px;color:#6b7280;margin-bottom:4px;">Solde restant</p>
      <p style="font-size:13px;font-weight:700;color:${totalBalance > 0 ? '#dc2626' : '#16a34a'};">${fmt(totalBalance)}</p>
    </div>
  </div>
</div>
${regSection}
${tuitionSection}
${paymentsSection}
<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:center;font-size:10px;color:#9ca3af;">
  Document confidentiel · École de Santé de Libreville · ${printDate}
</div>
</body></html>`

    try {
      const key = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(`esl_report:${key}`, JSON.stringify({ html, createdAt: Date.now() }))
      const url = `${window.location.origin}/report-viewer?key=${encodeURIComponent(key)}`
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) toast.error(t('popup_blocked'))
    } catch {
      toast.error(t('error'))
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
            {/* ── Report buttons ── */}
            <button
              onClick={handleAcademicReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium transition-colors"
              title="Rapport académique (imprimer)"
            >
              <DocumentTextIcon className="w-4 h-4" /> Académique
            </button>
            <button
              onClick={handleFinancialReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium transition-colors"
              title="Rapport financier (imprimer)"
            >
              <PrinterIcon className="w-4 h-4" /> Financier
            </button>
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

