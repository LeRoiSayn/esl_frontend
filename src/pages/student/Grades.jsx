import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/index.jsx'
import { studentApi } from '../../services/api'
import { PrinterIcon } from '@heroicons/react/24/outline'
import { LOGO_URL } from '../../utils/reportPrint'

function fmtScore(val) {
  if (val === null || val === undefined || val === '') return '—'
  return parseFloat(val).toFixed(1)
}

function mention20(score20) {
  // labels are translated via i18n in the caller (see mentionLabel)
  if (score20 >= 16) return 'very_good'
  if (score20 >= 14) return 'good'
  if (score20 >= 12) return 'fairly_good'
  if (score20 >= 10) return 'passable'
  return 'insufficient'
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
          const men = hasGrade ? t(`mention_${mention20(final / 5)}`) : '—'
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

    const logoSrc = LOGO_URL

    const html = `<!DOCTYPE html><html lang="fr"><head>
      <meta charset="UTF-8"/>
      <title>Relevé de notes — ${studentName}</title>
      <style>
        @page { margin: 15mm; size: A4; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #f3f4f6; font-size: 12px; }
        .toolbar {
          position:fixed;top:0;left:0;right:0;z-index:100;
          background:#111827;color:white;
          display:flex;align-items:center;justify-content:space-between;
          padding:10px 24px;gap:16px;box-shadow:0 2px 8px rgba(0,0,0,.25);
        }
        .toolbar-title { font-size:14px;font-weight:600; }
        .toolbar-sub { font-size:11px;opacity:.7;margin-top:1px; }
        .tbtn { display:flex;align-items:center;gap:7px;padding:8px 18px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:600; }
        .tbtn-p { background:#269c6d;color:white; } .tbtn-p:hover { background:#1a7a55; }
        .tbtn-c { background:rgba(255,255,255,.15);color:white; } .tbtn-c:hover { background:rgba(255,255,255,.25); }
        .page { background:#fff; max-width:860px; margin:68px auto 32px; padding:28px 32px; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,.1); }
        .hdr { display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:2px solid #e5e7eb;padding-bottom:14px;margin-bottom:18px; }
        .hdr-left { display:flex;align-items:center;gap:12px; }
        .hdr-logo { width:56px;height:56px;object-fit:contain;flex-shrink:0; }
        .hdr-title { font-size:15px;font-weight:700;color:#111827; }
        .hdr-doc { font-size:12px;font-weight:700;color:#269c6d;margin-top:3px; }
        .hdr-date { font-size:10px;color:#6b7280;text-align:right;white-space:nowrap; }
        .student-info { display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:6px;background:#f9fafb; }
        .student-info .row { display:flex;gap:6px; }
        .student-info .lbl { font-weight:700;color:#374151;min-width:90px;font-size:11px; }
        .student-info .val { color:#111827;font-size:11px; }
        table { width:100%;border-collapse:collapse;margin-top:14px;font-size:11px; }
        th { background:#f9fafb;color:#111827;padding:7px 8px;text-align:left;font-size:10px;font-weight:700;border:1px solid #e5e7eb; }
        td { padding:6px 8px;border:1px solid #e5e7eb; }
        .section-row td { background:#f0fdf4;color:#15803d;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.5px; }
        tr:nth-child(even) td { background:#f9fafb; }
        .center { text-align:center; }
        .bold { font-weight:700; }
        .pass { color:#16a34a; }
        .fail { color:#dc2626; }
        .no-grade td { color:#9ca3af;font-style:italic; }
        .footer { margin-top:24px;padding-top:10px;border-top:1px solid #e5e7eb;text-align:center;font-size:9px;color:#9ca3af; }
        @media print {
          body { background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
          .toolbar { display:none!important; }
          .page { margin:0;padding:0;box-shadow:none;border-radius:0;max-width:100%; }
        }
      </style>
    </head><body>
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:10px">
          <img src="${logoSrc}" alt="" style="width:32px;height:32px;object-fit:contain;opacity:.85" onerror="this.style.display='none'">
          <div>
            <div class="toolbar-title">Relevé de Notes Officiel</div>
            <div class="toolbar-sub">École de Santé de Libreville &nbsp;·&nbsp; ${studentName}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="tbtn tbtn-p" onclick="window.print()">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Imprimer
          </button>
          <button class="tbtn tbtn-c" onclick="window.close()">Fermer</button>
        </div>
      </div>
      <div class="page">
      <div class="hdr">
        <div class="hdr-left">
          <img src="${logoSrc}" class="hdr-logo" alt="ESL" onerror="this.style.display='none'">
          <div>
            <div class="hdr-title">École de Santé de Libreville</div>
            <div class="hdr-doc">Relevé de Notes Officiel</div>
          </div>
        </div>
        <div class="hdr-date">Généré le ${printDate}</div>
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
        <span>Généré le ${printDate}</span>
        <span>Document officiel — École de santé de Libreville</span>
      </div>
      </div>
    </body></html>`

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const pw = window.open(url, '_blank')
    if (pw) setTimeout(() => URL.revokeObjectURL(url), 60000)
    else {
      // Fallback: open in same tab (no pop-up permissions needed)
      window.location.assign(url)
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>

  // Screen (mark sheet) = current year only; print (transcript) = all years
  const currentEnrollments = enrollments.filter(e => e.status === 'enrolled')

  const totalCredits = currentEnrollments.reduce((sum, e) => sum + (e.class?.course?.credits || 0), 0)
  const graded = currentEnrollments.filter(e => e.grades?.length > 0 && e.grades[0]?.final_grade != null)
  const avgGrade = graded.length > 0 ? graded.reduce((s, e) => s + parseFloat(e.grades[0].final_grade), 0) / graded.length : 0
  const avgGrade20 = avgGrade / 5

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
          {t('view_transcript')}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">{t('total_credits')}</p>
          <p className="text-3xl font-bold text-primary-600">{totalCredits}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">{t('average_grade')}</p>
          <p className="text-3xl font-bold text-blue-600 tabular-nums">
            {avgGrade.toFixed(1)}<span className="text-lg font-semibold text-gray-500 dark:text-gray-400"> /100</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 tabular-nums">
            {avgGrade20.toFixed(2)} /20
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">{t('graded_courses')}</p>
          <p className="text-3xl font-bold text-teal-600">{graded.length}/{currentEnrollments.length}</p>
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
                <th className="text-center">{t('total_score_col')}<br /><span className="font-normal text-xs">/100 · /20</span></th>
                <th className="text-center">{t('mention_col')}</th>
                <th className="text-center">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {currentEnrollments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400 text-sm">
                    {t('no_active_courses_this_year')}
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
                        <div className="tabular-nums">
                          <span className={final >= 50 ? 'text-green-600' : 'text-red-500'}>
                            {final.toFixed(1)} /100
                          </span>
                          <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 mt-0.5">
                            ({(final / 5).toFixed(2)} /20)
                          </span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`badge ${g ? (final >= 50 ? 'badge-success' : 'badge-danger') : 'badge-info'}`}>
                          {g?.letter_grade || 'N/A'}
                        </span>
                        {final != null && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {t(`mention_${mention20(final / 5)}`)}
                          </span>
                        )}
                      </div>
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
