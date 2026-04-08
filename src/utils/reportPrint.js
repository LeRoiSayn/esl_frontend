/**
 * Client-side print reports: new tab + document write (mobile-friendly; avoids blob: pop-up blocks).
 */

export const esc = (val) =>
  String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

// Derive backend root from VITE_API_URL (strips /api suffix if present)
const _apiRoot = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
const _backendRoot = _apiRoot ? _apiRoot.replace(/\/api\/?$/, '') : ''
export const LOGO_URL = _backendRoot ? `${_backendRoot}/esl-logo.png` : '/esl-logo.png'

export const fmtRwf = (amount) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount || 0)) + ' RWF'

export const fmtDate = () =>
  new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })

export const BASE_STYLES = `
  @page { margin: 15mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; background: #f3f4f6; font-size: 12px; }
  .toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: #111827; color: white;
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 24px; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.25);
  }
  .toolbar-title { font-size: 14px; font-weight: 600; }
  .toolbar-sub { font-size: 11px; opacity: .7; margin-top: 1px; }
  .toolbar-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 18px; border-radius: 6px; border: none; cursor: pointer;
    font-size: 13px; font-weight: 600; transition: background .15s;
  }
  .btn-print { background: #269c6d; color: white; }
  .btn-print:hover { background: #1a7a55; }
  .btn-close { background: rgba(255,255,255,.15); color: white; }
  .btn-close:hover { background: rgba(255,255,255,.25); }
  .page { background: #fff; max-width: 860px; margin: 68px auto 32px; padding: 28px 32px; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,.1); }
  /* Document header — university name left, date right */
  .hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 14px; margin-bottom: 18px; }
  .hdr-title { font-size: 15px; font-weight: 700; color: #111827; }
  .hdr-doc { font-size: 12px; font-weight: 700; color: #269c6d; margin-top: 3px; }
  .hdr-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .hdr-date { font-size: 10px; color: #6b7280; text-align: right; white-space: nowrap; }
  /* Section headings — clean, no coloured backgrounds */
  .section-title { margin: 18px 0 10px; font-size: 13px; font-weight: 800; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
  .sec-title { margin: 14px 0 7px; font-size: 11px; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
  /* Group/level/faculty labels */
  .level-title { font-size: 12px; font-weight: 700; color: #111827; border-left: 3px solid #269c6d; padding: 4px 10px; margin: 14px 0 6px; }
  .faculty-title { font-size: 13px; font-weight: 700; color: #111827; border-left: 4px solid #269c6d; padding: 5px 10px; background: #f9fafb; margin: 18px 0 8px; }
  .dept-title { font-size: 11px; font-weight: 600; color: #374151; border-left: 2px solid #9ca3af; padding: 3px 8px; margin: 10px 0 5px; }
  /* Tables — clean, like the academic sheet */
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th { background: #f9fafb; color: #111827; padding: 7px 8px; text-align: left; font-size: 10px; font-weight: 700; border: 1px solid #e5e7eb; }
  td { padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 11px; color: #111827; background: #fff; }
  tr:nth-child(even) td { background: #f9fafb; }
  /* Status pills — neutral, no colour */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; border: 1px solid #d1d5db; background: #f9fafb; color: #374151; }
  .g { background: #f9fafb; color: #374151; border-color: #d1d5db; }
  .y { background: #f9fafb; color: #374151; border-color: #d1d5db; }
  .r { background: #f9fafb; color: #374151; border-color: #d1d5db; }
  .b { background: #f9fafb; color: #374151; border-color: #d1d5db; }
  /* Summary strip (replaces the KPI-grid) */
  .summary-row { display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
  .summary-cell { flex: 1; padding: 10px 14px; border-right: 1px solid #e5e7eb; }
  .summary-cell:last-child { border-right: none; }
  .summary-lbl { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; }
  .summary-val { font-size: 14px; font-weight: 700; margin-top: 3px; }
  /* Year box (per-year financial sections) */
  .year-box { border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 16px; overflow: hidden; }
  .year-hdr { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 10px 14px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .year-title { font-size: 13px; font-weight: 700; color: #111827; }
  .year-summary { display: flex; gap: 20px; font-size: 11px; color: #374151; }
  .year-body { padding: 0; }
  /* Generic info box */
  .info-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px; color: #374151; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #9ca3af; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none !important; }
    .page { margin: 0; padding: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
  }
`

const VIEWPORT_META =
  '<meta name="viewport" content="width=device-width, initial-scale=1">'

/**
 * Full HTML document for a report (toolbar + page).
 */
export function buildReportDocumentHtml(title, subtitle, body) {
  const date = fmtDate()
  const logoSrc = esc(LOGO_URL)
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${VIEWPORT_META}
<title>${esc(title)}</title><style>${BASE_STYLES}</style>
</head><body>
<div class="toolbar no-print">
  <div style="display:flex;align-items:center;gap:10px">
    <img src="${logoSrc}" alt="" style="width:32px;height:32px;object-fit:contain;opacity:.85" onerror="this.style.display='none'">
    <div>
      <div class="toolbar-title">${esc(title)}</div>
      <div class="toolbar-sub">École de Santé de Libreville &nbsp;·&nbsp; ${date}</div>
    </div>
  </div>
  <div style="display:flex;gap:8px">
    <button type="button" class="toolbar-btn btn-print" onclick="window.print()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Imprimer
    </button>
    <button type="button" class="toolbar-btn btn-close" onclick="window.close()">Fermer</button>
  </div>
</div>
<div class="page">
  <div class="hdr">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="${logoSrc}" alt="ESL" style="width:56px;height:56px;object-fit:contain;flex-shrink:0" onerror="this.style.display='none'">
      <div>
        <div class="hdr-title">École de Santé de Libreville</div>
        <div class="hdr-doc">${esc(subtitle)}</div>
      </div>
    </div>
    <div class="hdr-date">Généré le ${date}</div>
  </div>
  ${body}
  <div class="footer">Document généré automatiquement — École de Santé de Libreville — ${date}</div>
</div>
</body></html>`
}

/**
 * Open report in a new tab (same event tick as the click). Use when body is already available.
 */
export function openReport(title, subtitle, body) {
  const w = window.open('about:blank', '_blank', 'noopener,noreferrer')
  if (!w) return false
  try {
    w.document.open()
    w.document.write(buildReportDocumentHtml(title, subtitle, body))
    w.document.close()
    w.focus()
  } catch {
    try {
      w.close()
    } catch (_) {}
    return false
  }
  return true
}

/**
 * Fallback: render the report in the current tab.
 * This avoids browser pop-up permissions entirely.
 */
export function openReportInCurrentTab(title, subtitle, body) {
  try {
    document.open()
    document.write(buildReportDocumentHtml(title, subtitle, body))
    document.close()
    try {
      window.scrollTo(0, 0)
    } catch (_) {}
    return true
  } catch (_) {
    return false
  }
}

/**
 * Prefer new tab, fallback to current tab.
 */
export function openReportSafe(title, subtitle, body) {
  return openReport(title, subtitle, body) || openReportInCurrentTab(title, subtitle, body)
}

const LOADING_HTML = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">${VIEWPORT_META}<title>…</title></head><body style="font-family:system-ui,sans-serif;padding:24px;text-align:center;color:#374151">Chargement…</body></html>`

/**
 * For reports built after async work: opens a tab immediately (user gesture), then fills content.
 * load() must return { subtitle, body }.
 */
export async function openReportAsync(title, load) {
  const w = window.open('about:blank', '_blank', 'noopener,noreferrer')
  if (!w) return false
  try {
    w.document.open()
    w.document.write(LOADING_HTML)
    w.document.close()
    const { subtitle, body } = await load()
    w.document.open()
    w.document.write(buildReportDocumentHtml(title, subtitle, body))
    w.document.close()
    try {
      w.focus()
    } catch (_) {}
  } catch (e) {
    try {
      w.close()
    } catch (_) {}
    throw e
  }
  return true
}

/**
 * Async report: if pop-up is blocked, render in current tab after load().
 */
export async function openReportAsyncSafe(title, load) {
  const w = window.open('about:blank', '_blank', 'noopener,noreferrer')
  if (!w) {
    const { subtitle, body } = await load()
    return openReportInCurrentTab(title, subtitle, body)
  }
  try {
    w.document.open()
    w.document.write(LOADING_HTML)
    w.document.close()
    const { subtitle, body } = await load()
    w.document.open()
    w.document.write(buildReportDocumentHtml(title, subtitle, body))
    w.document.close()
    try { w.focus() } catch (_) {}
  } catch (e) {
    try { w.close() } catch (_) {}
    throw e
  }
  return true
}

/**
 * HTML body for online course attendance report (used with openReport).
 * @param {object} data – JSON from GET /elearning/courses/{id}/attendance-report
 */
export function buildOnlineCourseAttendanceReportBody(data) {
  const session = data?.session ?? {}
  const attendees = Array.isArray(data?.attendees) ? data.attendees : []
  const count = data?.attendee_count ?? attendees.length
  const scheduled = session.scheduled_at ? new Date(session.scheduled_at) : null

  const dateStr = scheduled
    ? scheduled.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'
  const timeStr = scheduled
    ? scheduled.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const descBlock = session.description
    ? `<div class="info-box"><strong>Description</strong><br>${esc(session.description).replace(/\n/g, '<br>')}</div>`
    : ''

  const courseLine = session.course_name
    ? `<p class="hdr-sub" style="margin-top:6px">Cours : ${esc(session.course_name)}</p>`
    : ''

  const rows =
    attendees.length > 0
      ? attendees
          .map((row) => {
            const joined = row.joined_at
              ? new Date(row.joined_at).toLocaleString('fr-FR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : '—'
            return `<tr><td>${esc(row.student?.name)}</td><td>${esc(row.student?.student_id)}</td><td>${esc(joined)}</td></tr>`
          })
          .join('')
      : `<tr><td colspan="3" style="text-align:center;color:#6b7280">Aucun participant enregistré</td></tr>`

  return `
    ${descBlock}
    ${courseLine}
    <div class="summary-row">
      <div class="summary-cell"><div class="summary-lbl">Date</div><div class="summary-val">${esc(dateStr)}</div></div>
      <div class="summary-cell"><div class="summary-lbl">Heure</div><div class="summary-val">${esc(timeStr)}</div></div>
      <div class="summary-cell"><div class="summary-lbl">Durée</div><div class="summary-val">${session.duration_minutes != null ? esc(String(session.duration_minutes)) + ' min' : '—'}</div></div>
      <div class="summary-cell"><div class="summary-lbl">Participants</div><div class="summary-val">${esc(String(count))}</div></div>
    </div>
    <div class="section-title">Liste des participants</div>
    <table>
      <thead><tr><th>Étudiant</th><th>Matricule</th><th>Connexion</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

/**
 * HTML body for quiz results (print / new tab) — same visual system as other ESL reports.
 */
export function buildQuizResultsReportBody({
  quiz,
  stats,
  attempts,
  courseName,
}) {
  const q = quiz || {}
  const st = stats || {}
  const passAt = parseFloat(q.passing_score)
  const rows =
    (attempts || [])
      .map((a) => {
        const sc = a.score
        const passed =
          typeof sc === 'number' &&
          !Number.isNaN(passAt) &&
          sc >= passAt
        const scoreStr =
          typeof sc === 'number' ? sc.toFixed(1) : String(sc ?? '—')
        const statusLbl = passed ? 'Réussi' : 'Non reçu'
        const done = a.completed_at
          ? new Date(a.completed_at).toLocaleString('fr-FR')
          : '—'
        return `<tr>
      <td>${esc(a.student?.name)}</td>
      <td style="font-family:monospace;font-size:10px">${esc(a.student?.registration_number || '—')}</td>
      <td style="text-align:center;font-weight:600">${esc(scoreStr)}/${esc(String(q.total_points ?? ''))}</td>
      <td style="text-align:center"><span class="badge">${esc(statusLbl)}</span></td>
      <td style="text-align:center">${esc(String(a.correct_count ?? '—'))}/${esc(String(a.total_questions ?? '—'))}</td>
      <td style="font-size:11px;color:#374151">${esc(done)}</td>
    </tr>`
      })
      .join('') ||
    `<tr><td colspan="6" style="text-align:center;color:#6b7280">Aucune tentative</td></tr>`

  const avg =
    typeof st.average_score === 'number'
      ? st.average_score.toFixed(1)
      : '—'
  const hi =
    typeof st.highest_score === 'number'
      ? st.highest_score.toFixed(1)
      : '—'
  const lo =
    typeof st.lowest_score === 'number'
      ? st.lowest_score.toFixed(1)
      : '—'
  const pr =
    typeof st.pass_rate === 'number' ? `${st.pass_rate.toFixed(0)} %` : '—'

  return `
    <div class="info-box">
      <strong>Cours :</strong> ${esc(courseName || '—')}
      &nbsp;·&nbsp; <strong>Seuil :</strong> ${esc(String(q.passing_score ?? '—'))} / ${esc(String(q.total_points ?? '—'))} pts
    </div>
    <div class="summary-row">
      <div class="summary-cell"><div class="summary-lbl">Tentatives</div><div class="summary-val">${esc(String(st.total_attempts ?? 0))}</div></div>
      <div class="summary-cell"><div class="summary-lbl">Moyenne</div><div class="summary-val">${esc(avg)}</div></div>
      <div class="summary-cell"><div class="summary-lbl">Maximum</div><div class="summary-val">${esc(hi)}</div></div>
      <div class="summary-cell"><div class="summary-lbl">Minimum</div><div class="summary-val">${esc(lo)}</div></div>
      <div class="summary-cell"><div class="summary-lbl">Taux de réussite</div><div class="summary-val">${esc(pr)}</div></div>
    </div>
    <div class="section-title">Détail des tentatives</div>
    <table>
      <thead><tr>
        <th>Étudiant</th>
        <th>Matricule</th>
        <th style="text-align:center">Score</th>
        <th style="text-align:center">Statut</th>
        <th style="text-align:center">Bonnes réponses</th>
        <th>Terminé le</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `
}
