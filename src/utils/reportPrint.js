/**
 * Shared utilities for client-side print report generation via Blob URLs.
 */

export const esc = (val) =>
  String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

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
  /* Status pills — border style (no solid-colour badges) */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; border: 1px solid; }
  .g { background: #f0fdf4; color: #15803d; border-color: #86efac; }
  .y { background: #fefce8; color: #a16207; border-color: #fde047; }
  .r { background: #fef2f2; color: #b91c1c; border-color: #fca5a5; }
  .b { background: #eff6ff; color: #1d4ed8; border-color: #93c5fd; }
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

/**
 * Build an HTML document from the given body HTML and open it in a new tab via Blob URL.
 * The report shows a fixed toolbar with a Print button — the user reviews first, then prints.
 */
export function openReport(title, subtitle, body) {
  const date = fmtDate()
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>${esc(title)}</title><style>${BASE_STYLES}</style>
</head><body>
<div class="toolbar no-print">
  <div>
    <div class="toolbar-title">${esc(title)}</div>
    <div class="toolbar-sub">École de Santé de Libreville &nbsp;·&nbsp; ${date}</div>
  </div>
  <div style="display:flex;gap:8px">
    <button class="toolbar-btn btn-print" onclick="window.print()">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
        <rect x="6" y="14" width="12" height="8"/>
      </svg>
      Imprimer
    </button>
    <button class="toolbar-btn btn-close" onclick="window.close()">Fermer</button>
  </div>
</div>
<div class="page">
  <div class="hdr">
    <div>
      <div class="hdr-title">École de Santé de Libreville</div>
      <div class="hdr-doc">${esc(subtitle)}</div>
    </div>
    <div class="hdr-date">Généré le ${date}</div>
  </div>
  ${body}
  <div class="footer">Document généré automatiquement — École de Santé de Libreville — ${date}</div>
</div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html; charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const pw = window.open(url, '_blank')
  if (!pw) { URL.revokeObjectURL(url); return false }
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return true
}
