import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/index.jsx'
import { studentApi } from '../../services/api'
import { PrinterIcon } from '@heroicons/react/24/outline'

function fmtScore(val) {
  if (val === null || val === undefined || val === '') return '—'
  return parseFloat(val).toFixed(1)
}

function mention20(score20) {
  if (score20 >= 16) return 'Très Bien'
  if (score20 >= 14) return 'Bien'
  if (score20 >= 12) return 'Assez Bien'
  if (score20 >= 10) return 'Passable'
  return 'Insuffisant'
}

export default function StudentGrades() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user?.student?.id) fetchGrades() }, [user])

  const fetchGrades = async () => {
    try { const response = await studentApi.getGrades(user.student.id); setEnrollments(response.data.data) }
    catch { toast.error(t('error')) }
    finally { setLoading(false) }
  }

  const handlePrint = () => {
    // Group ALL courses by level → semester (for a proper academic transcript)
    const SEM_LABELS = { '1': 'Semestre 1', '2': 'Semestre 2', '3': "Semestre d'été / Rattrapage" }
    const LEVEL_ORDER = ['L1','L2','L3','M1','M2','D1','D2','D3']
    const grouped = {}
    enrollments.forEach(e => {
      const level = e.class?.course?.level || 'Niveau inconnu'
      const sem = e.class?.semester || '?'
      if (!grouped[level]) grouped[level] = {}
      if (!grouped[level][sem]) grouped[level][sem] = []
      grouped[level][sem].push(e)
    })

    let tableBody = ''
    const sortedLevels = Object.keys(grouped).sort((a, b) => {
      const ia = LEVEL_ORDER.indexOf(a), ib = LEVEL_ORDER.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    sortedLevels.forEach(level => {
      Object.entries(grouped[level]).sort(([a], [b]) => a.localeCompare(b)).forEach(([sem, courses]) => {
        const semLabel = SEM_LABELS[sem] || `Semestre ${sem}`
        tableBody += `<tr class="section-row"><td colspan="9">${level} — ${semLabel}</td></tr>`
        courses.forEach(e => {
          const g = e.grades?.[0]
          const hasGrade = g && g.final_grade != null
          const final = hasGrade ? parseFloat(g.final_grade) : null
          const score20 = hasGrade ? (final / 5).toFixed(2) : null
          const men = hasGrade ? mention20(final / 5) : '—'
          const passClass = hasGrade ? (final / 5 >= 10 ? 'pass' : 'fail') : ''
          tableBody += `<tr class="${hasGrade ? '' : 'no-grade'}">
            <td>${e.class?.course?.name || '—'}</td>
            <td>${e.class?.course?.code || '—'}</td>
            <td class="center">${g?.attendance_score ?? '—'}</td>
            <td class="center">${g?.quiz_score ?? '—'}</td>
            <td class="center">${g?.continuous_assessment ?? '—'}</td>
            <td class="center">${g?.exam_score ?? '—'}</td>
            <td class="center bold">${hasGrade ? final.toFixed(1) + '/100' : '—'}</td>
            <td class="center bold ${passClass}">${score20 ? score20 + '/20' : '—'}</td>
            <td class="center">${men}</td>
          </tr>`
        })
      })
    })

    const printDate = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
    const studentName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim()
    const matricule = user?.student?.student_id || '—'
    const level = user?.student?.level || '—'

    const html = `<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8"/>
      <title>Relevé de notes — ${studentName}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 30px; color: #111; font-size: 12px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 3px double #1e40af; padding-bottom: 16px; }
        .header img { height: 80px; margin-bottom: 6px; }
        .header h1 { font-size: 20px; color: #1e40af; margin: 4px 0; font-weight: bold; letter-spacing: 1px; }
        .header h2 { font-size: 13px; color: #333; margin: 2px 0; font-weight: normal; }
        .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin: 16px 0; padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; }
        .student-info .row { display: flex; gap: 6px; }
        .student-info .lbl { font-weight: bold; color: #374151; min-width: 90px; }
        .student-info .val { color: #111; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11.5px; }
        th { background: #1e40af; color: white; padding: 7px 8px; text-align: left; font-size: 11px; }
        td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
        .section-row td { background: #dbeafe; color: #1e3a8a; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 8px; }
        tr:nth-child(even) td:not(.section-row td) { background: #f8fafc; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .pass { color: #16a34a; }
        .fail { color: #dc2626; }
        .no-grade td { color: #9ca3af; font-style: italic; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { margin: 15mm 20mm; } }
      </style>
    </head><body>
      <div class="header">
        <img src="/esl-logo.png" onerror="this.style.display='none'"/>
        <h1>ÉCOLE DE SANTÉ DE LIBREVILLE</h1>
        <h2>Relevé de Notes Officiel</h2>
      </div>
      <div class="student-info">
        <div class="row"><span class="lbl">Nom :</span><span class="val">${user?.last_name || '—'}</span></div>
        <div class="row"><span class="lbl">Prénom :</span><span class="val">${user?.first_name || '—'}</span></div>
        <div class="row"><span class="lbl">Email :</span><span class="val">${user?.email || '—'}</span></div>
        <div class="row"><span class="lbl">Téléphone :</span><span class="val">${user?.phone || '—'}</span></div>
        <div class="row"><span class="lbl">Matricule :</span><span class="val">${matricule}</span></div>
        <div class="row"><span class="lbl">Niveau :</span><span class="val">${level}</span></div>
      </div>
      <table>
        <thead><tr>
          <th>Cours</th><th>Code</th>
          <th class="center">Présence<br/><span style="font-weight:normal">/10</span></th>
          <th class="center">Quiz<br/><span style="font-weight:normal">/20</span></th>
          <th class="center">CC<br/><span style="font-weight:normal">/30</span></th>
          <th class="center">Examen<br/><span style="font-weight:normal">/40</span></th>
          <th class="center">Total<br/><span style="font-weight:normal">/100</span></th>
          <th class="center">Note<br/><span style="font-weight:normal">/20</span></th>
          <th class="center">Mention</th>
        </tr></thead>
        <tbody>${tableBody || '<tr><td colspan="9" style="text-align:center;color:#999;padding:20px">Aucune note validée</td></tr>'}</tbody>
      </table>
      <div class="footer">
        <span>Imprimé le ${printDate}</span>
        <span>Document officiel — École de santé de Libreville</span>
      </div>
    </body></html>`

    const pw = window.open('', '_blank')
    pw.document.write(html)
    pw.document.close()
    pw.focus()
    setTimeout(() => { pw.print(); }, 400)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  // Screen (mark sheet) = current year only; print (transcript) = all years
  const currentEnrollments = enrollments.filter(e => e.status === 'enrolled')

  const totalCredits = currentEnrollments.reduce((sum, e) => sum + (e.class?.course?.credits || 0), 0)
  const graded = currentEnrollments.filter(e => e.grades?.length > 0 && e.grades[0]?.final_grade != null)
  const avgGrade = graded.length > 0 ? graded.reduce((s, e) => s + parseFloat(e.grades[0].final_grade), 0) / graded.length : 0

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('my_grades')}</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('gradebook_subtitle')}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <PrinterIcon className="w-4 h-4" />
          Relevé de notes
        </button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">{t('total_credits')}</p>
          <p className="text-3xl font-bold text-primary-600">{totalCredits}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">{t('average_grade')}</p>
          <p className="text-3xl font-bold text-blue-600">{avgGrade.toFixed(1)}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">{t('graded_courses')}</p>
          <p className="text-3xl font-bold text-teal-600">{graded.length}/{enrollments.length}</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t('course')}</th>
                <th>{t('code')}</th>
                <th>{t('credits')}</th>
                <th className="text-center">{t('presence_short')}<br/><span className="font-normal text-xs">/10</span></th>
                <th className="text-center">{t('quiz')}<br/><span className="font-normal text-xs">/20</span></th>
                <th className="text-center">{t('cc_short')}<br/><span className="font-normal text-xs">/30</span></th>
                <th className="text-center">{t('exam')}<br/><span className="font-normal text-xs">/40</span></th>
                <th className="text-center">{t('total_score_col')}</th>
                <th className="text-center">{t('mention_col')}</th>
                <th className="text-center">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {currentEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400 text-sm">
                    Aucun cours actif pour cette année académique
                  </td>
                </tr>
              ) : currentEnrollments.map(enrollment => {
                const g = enrollment.grades?.[0]
                const final = g?.final_grade != null ? parseFloat(g.final_grade) : null
                return (
                  <tr key={enrollment.id}>
                    <td className="font-medium">{enrollment.class?.course?.name}</td>
                    <td className="text-gray-500">{enrollment.class?.course?.code}</td>
                    <td className="text-center">{enrollment.class?.course?.credits}</td>
                    <td className="text-center">{fmtScore(g?.attendance_score)}</td>
                    <td className="text-center">{fmtScore(g?.quiz_score)}</td>
                    <td className="text-center">{fmtScore(g?.continuous_assessment)}</td>
                    <td className="text-center">{fmtScore(g?.exam_score)}</td>
                    <td className="text-center font-semibold">
                      {final != null ? (
                        <span className={final >= 50 ? 'text-green-600' : 'text-red-500'}>{final.toFixed(1)}</span>
                      ) : '—'}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${g ? (final >= 50 ? 'badge-success' : 'badge-danger') : 'badge-info'}`}>
                        {g?.letter_grade || 'N/A'}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${g ? (final >= 50 ? 'badge-success' : 'badge-danger') : 'badge-warning'}`}>
                        {g ? (final >= 50 ? t('passed') : t('failed')) : t('pending')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
