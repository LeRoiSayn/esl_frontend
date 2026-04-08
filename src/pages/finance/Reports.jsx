import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ChartBarIcon, UserGroupIcon, DocumentTextIcon, PrinterIcon } from '@heroicons/react/24/outline'
import { dashboardApi, paymentApi, studentFeeApi, feeTypeApi } from '../../services/api'
import { useI18n } from '../../i18n/index.jsx'
import { esc, fmtRwf, openReportAsync } from '../../utils/reportPrint'

function ReportCard({ icon: Icon, iconBg, iconColor, title, description, onGenerate, loading, delay = 0 }) {
  const { t } = useI18n()
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-200"
    >
      <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
          bg-primary-600 hover:bg-primary-700 active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <PrinterIcon className="w-4 h-4" />
        }
        {loading ? t('generating') : t('view_report')}
      </button>
    </motion.div>
  )
}

export default function FinanceReports() {
  const { t } = useI18n()
  const [loadingGlobal, setLoadingGlobal] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [loadingFeeTypes, setLoadingFeeTypes] = useState(false)

  // ── Rapport Global ───────────────────────────────────────────────────────
  const handleGlobal = async () => {
    setLoadingGlobal(true)
    try {
      if (!(await openReportAsync(t('finance_report_global_title'), async () => {
        const [statsRes, paymentsRes] = await Promise.all([
          dashboardApi.getFinanceStats(),
          paymentApi.getAll({ per_page: 500 }),
        ])
        const stats = statsRes.data?.data || {}
        const payments = paymentsRes.data?.data?.data || paymentsRes.data?.data || []
        const monthly = stats.monthly_trends || []
        const byType = stats.revenue_by_type || stats.revenue_by_fee_type || []

        const kpi = `<div class="summary-row">
        <div class="summary-cell"><div class="summary-lbl">Revenus Totaux</div><div class="summary-val" style="color:#15803d">${fmtRwf(stats.total_revenue)}</div></div>
        <div class="summary-cell"><div class="summary-lbl">Frais en Attente</div><div class="summary-val" style="color:#b91c1c">${fmtRwf(stats.pending_fees)}</div></div>
        <div class="summary-cell"><div class="summary-lbl">Collecte du Jour</div><div class="summary-val" style="color:#1d4ed8">${fmtRwf(stats.today_collection)}</div></div>
        <div class="summary-cell"><div class="summary-lbl">Revenus du Mois</div><div class="summary-val" style="color:#269c6d">${fmtRwf(stats.monthly_revenue)}</div></div>
      </div>`

        const monthlyRows = monthly.length
          ? monthly.map(m => `<tr><td>${esc(m.month)}</td><td style="text-align:right;font-weight:600">${fmtRwf(m.total)}</td></tr>`).join('')
          : '<tr><td colspan="2" style="text-align:center;color:#9ca3af;padding:12px">Aucune donnée disponible</td></tr>'

        const typeRows = byType.length
          ? byType.map(t => `<tr>
            <td><strong>${esc(t.name)}</strong></td>
            <td style="text-align:center">${esc(String(t.count || 0))}</td>
            <td style="text-align:right;font-weight:600;color:#15803d">${fmtRwf(t.total)}</td>
          </tr>`).join('')
          : '<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:12px">Aucune donnée</td></tr>'

        const recentRows = payments.slice(0, 30).map(p => {
          const nm = `${esc(p.student_fee?.student?.user?.first_name || '')} ${esc(p.student_fee?.student?.user?.last_name || '')}`.trim() || '—'
          return `<tr>
          <td style="font-family:monospace;font-size:10px">${esc(p.reference_number)}</td>
          <td>${nm}</td>
          <td>${esc(p.payment_method || '—')}</td>
          <td>${esc(p.payment_date?.substring(0, 10) || '—')}</td>
          <td style="text-align:right;font-weight:600;color:#15803d">${fmtRwf(p.amount)}</td>
        </tr>`
        }).join('') || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:12px">Aucun paiement</td></tr>'

        const body = `
        ${kpi}
        <div class="sec-title">Tendances Mensuelles (6 derniers mois)</div>
        <table><thead><tr><th>Mois</th><th style="text-align:right">Montant Collecté</th></tr></thead>
        <tbody>${monthlyRows}</tbody></table>
        <div class="sec-title">Revenus par Type de Frais</div>
        <table><thead><tr><th>Type de Frais</th><th style="text-align:center">Nb Paiements</th><th style="text-align:right">Total Collecté</th></tr></thead>
        <tbody>${typeRows}</tbody></table>
        <div class="sec-title">30 Derniers Paiements</div>
        <table><thead><tr><th>Référence</th><th>Étudiant</th><th>Méthode</th><th>Date</th><th style="text-align:right">Montant</th></tr></thead>
        <tbody>${recentRows}</tbody></table>`
        return { subtitle: t('finance_report_global_subtitle'), body }
      }))) {
        toast.error(t('popup_blocked'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setLoadingGlobal(false)
    }
  }

  // ── Rapport par Étudiant ─────────────────────────────────────────────────
  const handleStudents = async () => {
    setLoadingStudents(true)
    try {
      if (!(await openReportAsync(t('finance_report_by_student_title'), async () => {
        const res = await studentFeeApi.getAll({ per_page: 2000 })
        const fees = res.data?.data?.data || res.data?.data || []

        const map = {}
        fees.forEach(f => {
          const sid = f.student?.id
          if (!sid) return
          if (!map[sid]) {
            map[sid] = {
              name: `${f.student?.user?.first_name || ''} ${f.student?.user?.last_name || ''}`.trim() || '—',
              student_id: f.student?.student_id || '—',
              level: f.student?.level || '—',
              total: 0, paid: 0,
            }
          }
          map[sid].total += parseFloat(f.amount || 0)
          map[sid].paid += parseFloat(f.paid_amount || 0)
        })

        const rows = Object.values(map)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(s => {
            const bal = s.total - s.paid
            const pct = s.total > 0 ? Math.round((s.paid / s.total) * 100) : 0
            const cls = bal <= 0 ? 'g' : pct > 0 ? 'y' : 'r'
            const lbl = bal <= 0 ? 'Soldé' : pct > 0 ? 'Partiel' : 'En attente'
            return `<tr>
            <td><strong>${esc(s.name)}</strong></td>
            <td style="font-family:monospace;font-size:10px">${esc(s.student_id)}</td>
            <td style="text-align:center">${esc(s.level)}</td>
            <td style="text-align:right">${fmtRwf(s.total)}</td>
            <td style="text-align:right;color:#15803d">${fmtRwf(s.paid)}</td>
            <td style="text-align:right;font-weight:600;color:${bal > 0 ? '#b91c1c' : '#15803d'}">${fmtRwf(bal)}</td>
            <td style="text-align:center">${pct}%</td>
            <td style="text-align:center"><span class="badge ${cls}">${lbl}</span></td>
          </tr>`
          }).join('') || '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:16px">Aucun étudiant</td></tr>'

        const body = `<table><thead><tr>
        <th>Étudiant</th><th>Matricule</th><th style="text-align:center">Niveau</th>
        <th style="text-align:right">Total Dû</th><th style="text-align:right">Payé</th>
        <th style="text-align:right">Solde</th><th style="text-align:center">Taux</th>
        <th style="text-align:center">Statut</th>
      </tr></thead><tbody>${rows}</tbody></table>`
        return { subtitle: t('finance_report_by_student_subtitle'), body }
      }))) {
        toast.error(t('popup_blocked'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setLoadingStudents(false)
    }
  }

  // ── Rapport par Type de Frais ────────────────────────────────────────────
  const handleFeeTypes = async () => {
    setLoadingFeeTypes(true)
    try {
      if (!(await openReportAsync(t('finance_report_by_fee_type_title'), async () => {
        const [typesRes, feesRes] = await Promise.all([
          feeTypeApi.getAll({ per_page: 200 }),
          studentFeeApi.getAll({ per_page: 2000 }),
        ])
        const types = typesRes.data?.data?.data || typesRes.data?.data || []
        const fees = feesRes.data?.data?.data || feesRes.data?.data || []

        const rows = types.map(type => {
          const match = fees.filter(f => (f.fee_type_id ?? f.fee_type?.id) === type.id)
          const total = match.reduce((s, f) => s + parseFloat(f.amount || 0), 0)
          const paid = match.reduce((s, f) => s + parseFloat(f.paid_amount || 0), 0)
          const bal = total - paid
          const rate = total > 0 ? Math.round((paid / total) * 100) : 0
          const cls = rate >= 80 ? 'g' : rate >= 50 ? 'y' : 'r'
          return `<tr>
          <td><strong>${esc(type.name)}</strong></td>
          <td>${esc(type.category || '—')}</td>
          <td style="text-align:center">${match.length}</td>
          <td style="text-align:right">${fmtRwf(type.amount)}</td>
          <td style="text-align:right">${fmtRwf(total)}</td>
          <td style="text-align:right;color:#15803d">${fmtRwf(paid)}</td>
          <td style="text-align:right;font-weight:600;color:${bal > 0 ? '#b91c1c' : '#15803d'}">${fmtRwf(bal)}</td>
          <td style="text-align:center"><span class="badge ${cls}">${rate}%</span></td>
        </tr>`
        }).join('') || '<tr><td colspan="8" style="text-align:center;color:#9ca3af;padding:16px">Aucun type de frais</td></tr>'

        const body = `<table><thead><tr>
        <th>Type de Frais</th><th>Catégorie</th><th style="text-align:center">Nb Étudiants</th>
        <th style="text-align:right">Montant Unit.</th><th style="text-align:right">Total Attendu</th>
        <th style="text-align:right">Collecté</th><th style="text-align:right">Solde</th>
        <th style="text-align:center">Taux</th>
      </tr></thead><tbody>${rows}</tbody></table>`
        return { subtitle: t('finance_report_by_fee_type_subtitle'), body }
      }))) {
        toast.error(t('popup_blocked'))
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setLoadingFeeTypes(false)
    }
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Rapports Financiers
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Générez et imprimez les rapports financiers de l'institution
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportCard
          icon={ChartBarIcon}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          title="Rapport Global des Finances"
          description="Vue d'ensemble complète : revenus totaux, tendances mensuelles, répartition par type de frais et historique des 30 derniers paiements."
          onGenerate={handleGlobal}
          loading={loadingGlobal}
          delay={0}
        />
        <ReportCard
          icon={UserGroupIcon}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          title="Rapport par Étudiant"
          description="État financier individuel : frais dus, montant payé, solde restant et taux de paiement pour chaque étudiant."
          onGenerate={handleStudents}
          loading={loadingStudents}
          delay={0.1}
        />
        <ReportCard
          icon={DocumentTextIcon}
          iconBg="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
          title="Rapport par Type de Frais"
          description="Analyse par catégorie : nombre d'étudiants concernés, montant attendu, collecté et taux de recouvrement."
          onGenerate={handleFeeTypes}
          loading={loadingFeeTypes}
          delay={0.2}
        />
      </div>
    </div>
  )
}
