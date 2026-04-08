import { useState, useEffect, Fragment } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useI18n } from '../../i18n/index.jsx'
import { studentApi } from '../../services/api'
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import { esc, fmtRwf, openReport } from '../../utils/reportPrint'

export default function StudentFees() {
  const { user } = useAuth()
  const { t, language } = useI18n()
  const [data, setData] = useState({ fees: [], summary: {} })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.student?.id) fetchFees()
  }, [user])

  const fetchFees = async () => {
    try {
      const response = await studentApi.getFees(user.student.id)
      setData(response.data.data)
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'fr-FR').format(amount || 0) + ' FCFA'

  const handleFinancialReport = () => {
    const fees = data.fees || []
    const summary = data.summary || {}
    const allPay = data.all_payments || fees.flatMap(f => f.payments || [])
    const studentName = `${esc(user?.first_name || '')} ${esc(user?.last_name || '')}`.trim()
    const matricule = esc(user?.student?.student_id || '—')
    const level = esc(user?.student?.level || '—')

    const stLabels = {
      paid: t('settled'),
      partial: t('partial'),
      pending: t('pending'),
      overdue: t('overdue'),
    }

    const feeRows = fees.map(f => {
      const bal = parseFloat(f.amount || 0) - parseFloat(f.paid_amount || 0)
      const stMap = { paid: ['g', stLabels.paid], partial: ['y', stLabels.partial], pending: ['b', stLabels.pending], overdue: ['r', stLabels.overdue] }
      const [cls, lbl] = stMap[f.status] || ['b', esc(stLabels[f.status] || f.status || '—')]
      return `<tr>
        <td><strong>${esc(f.fee_type?.name || t('menu_fees'))}</strong></td>
        <td style="text-align:right">${fmtRwf(f.amount)}</td>
        <td style="text-align:right;color:#15803d">${fmtRwf(f.paid_amount)}</td>
        <td style="text-align:right;font-weight:600;color:${bal > 0 ? '#b91c1c' : '#15803d'}">${fmtRwf(bal)}</td>
        <td style="text-align:center">${f.due_date ? new Date(f.due_date).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR') : '—'}</td>
        <td style="text-align:center">${esc(f.academic_year || '—')}</td>
        <td style="text-align:center"><span class="badge ${cls}">${lbl}</span></td>
      </tr>`
    }).join('') || `<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:12px">${t('no_fees')}</td></tr>`

    const payRows = allPay.slice(0, 30).map(p => `<tr>
      <td style="font-family:monospace;font-size:10px">${esc(p.reference_number || '—')}</td>
      <td>${esc(p.student_fee?.fee_type?.name || p.fee_type_name || '—')}</td>
      <td>${esc(p.payment_method || '—')}</td>
      <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR') : '—'}</td>
      <td style="text-align:right;font-weight:600;color:#15803d">${fmtRwf(p.amount)}</td>
    </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:12px">${t('no_payments')}</td></tr>`

    const body = `
      <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">
          <div><span style="color:#6b7280">${t('name')} :</span> <strong>${studentName}</strong></div>
          <div><span style="color:#6b7280">${t('matricule')} :</span> <strong style="font-family:monospace">${matricule}</strong></div>
          <div><span style="color:#6b7280">${t('level')} :</span> <strong>${level}</strong></div>
          <div><span style="color:#6b7280">${t('email')} :</span> ${esc(user?.email || '—')}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
        <div class="kpi"><div class="lbl">${t('total_due')}</div><div class="val">${fmtRwf(summary.total)}</div></div>
        <div class="kpi"><div class="lbl">${t('paid')}</div><div class="val" style="color:#15803d">${fmtRwf(summary.paid)}</div></div>
        <div class="kpi"><div class="lbl">${t('remaining_balance')}</div><div class="val" style="color:${(summary.balance || 0) > 0 ? '#b91c1c' : '#15803d'}">${fmtRwf(summary.balance)}</div></div>
      </div>
      <div class="sec-title">${t('fees_details')}</div>
      <table><thead><tr>
        <th>${t('fee_type')}</th><th style="text-align:right">${t('amount')}</th>
        <th style="text-align:right">${t('paid')}</th><th style="text-align:right">${t('balance')}</th>
        <th style="text-align:center">${t('due_date')}</th><th style="text-align:center">${t('academic_year')}</th>
        <th style="text-align:center">${t('status')}</th>
      </tr></thead><tbody>${feeRows}</tbody></table>
      <div class="sec-title">${t('payment_history')}</div>
      <table><thead><tr>
        <th>${t('reference')}</th><th>${t('fee_type')}</th><th>${t('method')}</th><th>${t('date')}</th>
        <th style="text-align:right">${t('amount')}</th>
      </tr></thead><tbody>${payRows}</tbody></table>`

    if (!openReport(t('financial_report_title'), `${t('financial_report_title')} — ${studentName}`, body)) {
      alert(t('popup_blocked_allow'))
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      paid: { label: t('paid'), bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
      partial: { label: t('partial'), bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400' },
      pending: { label: t('pending'), bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400' },
      overdue: { label: t('overdue'), bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
    }
    return configs[status] || configs.pending
  }

  /**
   * For a fee with an installment plan, compute each installment's effective paid status
   * by consuming only payments made SINCE the plan was created (paid_amount - base_paid_amount).
   *
   * base_paid_amount is stored in the plan JSON at creation time.
   * For older plans without it, we infer it as: fee.amount - sum(installments).
   */
  const getInstallmentRows = (fee) => {
    if (!fee.installment_plan?.installments) return null
    const plan = fee.installment_plan
    // base_paid_amount = how much was already paid BEFORE the plan was created.
    // New plans store it explicitly; old plans fall back to current paid_amount
    // (meaning: assume no installment has been paid yet on old plans).
    const basePaid = parseFloat(plan.base_paid_amount ?? fee.paid_amount ?? 0)
    // Payments made THROUGH the installment plan = total paid minus the pre-plan base
    let remaining = Math.max(0, parseFloat(fee.paid_amount || 0) - basePaid)
    return plan.installments.map(inst => {
      const amt = parseFloat(inst.amount)
      if (remaining >= amt) {
        remaining -= amt
        return { ...inst, effectivePaid: amt, isPaid: true }
      }
      const partial = remaining
      remaining = 0
      return { ...inst, effectivePaid: partial, isPaid: false }
    })
  }

  /**
   * Find the next item the student needs to pay:
   * - If the fee has an installment plan → use the first unpaid installment's amount & date
   * - Otherwise → use the fee's balance & due_date
   */
  const computeNextDue = (fees) => {
    const candidates = []
    ;(fees || []).forEach(fee => {
      if (fee.status === 'paid') return
      if (fee.installment_plan?.installments) {
        const rows = getInstallmentRows(fee)
        const next = rows.find(r => !r.isPaid)
        if (next && next.due_date) {
          const dueMs = new Date(next.due_date).setHours(0, 0, 0, 0)
          candidates.push({ amount: parseFloat(next.amount) - next.effectivePaid, due_date: next.due_date, _dueMs: dueMs })
        }
      } else {
        const bal = parseFloat(fee.amount || 0) - parseFloat(fee.paid_amount || 0)
        if (bal > 0 && fee.due_date) {
          const dueMs = new Date(fee.due_date).setHours(0, 0, 0, 0)
          candidates.push({ amount: bal, due_date: fee.due_date, _dueMs: dueMs })
        }
      }
    })
    return candidates.sort((a, b) => a._dueMs - b._dueMs)[0] || null
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 bg-gray-100 dark:bg-dark-200 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-dark-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  const balance = (data.summary?.balance || 0)
  const isPaid = balance <= 0
  const totalFees = data.summary?.total || 0
  const paidAmount = data.summary?.paid || 0
  const paymentPercent = totalFees > 0 ? Math.round((paidAmount / totalFees) * 100) : 100

  // Smart alert: use installment-aware next-due computation
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const nextDue = computeNextDue(data.fees)
  const daysUntilDue = nextDue ? Math.ceil((nextDue._dueMs - today.getTime()) / 86400000) : null
  const alertLevel = isPaid ? 'ok'
    : daysUntilDue !== null && daysUntilDue <= 0  ? 'overdue'
    : daysUntilDue !== null && daysUntilDue <= 2  ? 'urgent'
    : daysUntilDue !== null && daysUntilDue <= 7  ? 'warning'
    : daysUntilDue !== null && daysUntilDue <= 30 ? 'soon'
    : 'neutral'

  const cfgMap = {
    ok:      { bg:'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',      iconBg:'bg-green-100 dark:bg-green-900/40',   icon:<CheckCircleIcon className="w-7 h-7 text-green-600 dark:text-green-400"/>,       title:'text-green-800 dark:text-green-300',   sub:'text-green-600 dark:text-green-400',  bar:'bg-green-500' },
    overdue: { bg:'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600',              iconBg:'bg-red-100 dark:bg-red-900/40',        icon:<ExclamationTriangleIcon className="w-7 h-7 text-red-600 dark:text-red-400"/>,   title:'text-red-800 dark:text-red-300',       sub:'text-red-600 dark:text-red-400',     bar:'bg-red-500' },
    urgent:  { bg:'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',              iconBg:'bg-red-100 dark:bg-red-900/40',        icon:<ExclamationTriangleIcon className="w-7 h-7 text-red-600 dark:text-red-400"/>,   title:'text-red-800 dark:text-red-300',       sub:'text-red-600 dark:text-red-400',     bar:'bg-red-500' },
    warning: { bg:'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700',  iconBg:'bg-orange-100 dark:bg-orange-900/40',  icon:<ExclamationCircleIcon className="w-7 h-7 text-orange-500 dark:text-orange-400"/>, title:'text-orange-800 dark:text-orange-300', sub:'text-orange-600 dark:text-orange-400', bar:'bg-orange-500' },
    soon:    { bg:'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',          iconBg:'bg-blue-100 dark:bg-blue-900/40',      icon:<ClockIcon className="w-7 h-7 text-blue-500 dark:text-blue-400"/>,               title:'text-blue-800 dark:text-blue-300',     sub:'text-blue-600 dark:text-blue-400',   bar:'bg-blue-500' },
    neutral: { bg:'bg-gray-50 dark:bg-dark-200 border-gray-200 dark:border-dark-100',             iconBg:'bg-gray-100 dark:bg-dark-300',         icon:<ClockIcon className="w-7 h-7 text-gray-500 dark:text-gray-400"/>,                title:'text-gray-700 dark:text-gray-300',     sub:'text-gray-500 dark:text-gray-400',   bar:'bg-gray-400' },
  }
  const cfg = cfgMap[alertLevel]

  const nextDueBalance = nextDue ? nextDue.amount : 0
  const nextDueDateFmt = nextDue ? new Date(nextDue.due_date).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }) : ''

  const bannerTitle = alertLevel === 'ok' ? t('fees_paid_status')
    : alertLevel === 'overdue' ? t('payment_overdue_banner')
    : alertLevel === 'urgent'  ? `${t('payment_due_in')} ${daysUntilDue} ${daysUntilDue !== 1 ? t('days') : t('day')} !`
    : alertLevel === 'warning' ? `${t('next_payment_in')} ${daysUntilDue} ${daysUntilDue !== 1 ? t('days') : t('day')}`
    : alertLevel === 'soon'    ? `${t('next_payment_in')} ${daysUntilDue} ${daysUntilDue !== 1 ? t('days') : t('day')}`
    : t('fees_pending_neutral')

  const bannerSub = alertLevel === 'ok' ? t('fees_all_paid')
    : alertLevel === 'overdue'
        ? t('overdue_balance_notice').replace('{amount}', formatCurrency(nextDueBalance))
    : (alertLevel === 'urgent' || alertLevel === 'warning' || alertLevel === 'soon')
        ? t('next_installment_notice').replace('{amount}', formatCurrency(nextDueBalance)).replace('{date}', nextDueDateFmt)
    : `${t('total_remaining_prefix')} ${formatCurrency(balance)}`

  // Payment history: prefer all_payments (all years) from backend, fallback to current fees
  const allPaymentsHistory = data.all_payments?.length > 0
    ? data.all_payments
    : [...(data.fees?.flatMap(f => f.payments || []) || [])].sort(
        (a, b) => new Date(b.payment_date) - new Date(a.payment_date)
      )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('school_fees')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('academic_year')} {data.academic_year || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`}
          </p>
        </div>
        <button
          onClick={handleFinancialReport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <PrinterIcon className="w-4 h-4" />
          {t('view_report')}
        </button>
      </motion.div>

      {/* Smart Payment Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-4 flex items-center gap-4 border-2 ${cfg.bg}`}
      >
        <div className={`p-3 rounded-full ${cfg.iconBg}`}>{cfg.icon}</div>
        <div className="flex-1">
          <h3 className={`font-semibold text-lg ${cfg.title}`}>{bannerTitle}</h3>
          <p className={`text-sm ${cfg.sub}`}>{bannerSub}</p>
          {!isPaid && totalFees > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className={cfg.sub}>{paymentPercent}% {t('paid')}</span>
                <span className={cfg.sub}>{formatCurrency(paidAmount)} / {formatCurrency(totalFees)}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${cfg.bar}`} style={{ width: `${paymentPercent}%` }} />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tuition Overview - Simple and Clean */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100 p-6"
      >
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{t('summary')}</h2>
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('total_fees')}</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {formatCurrency(data.summary?.total)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('amount_paid_label')}</p>
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">
              {formatCurrency(data.summary?.paid)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('remaining_balance')}</p>
            <p className={`text-xl font-semibold ${
              (data.summary?.balance || 0) > 0 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-green-600 dark:text-green-400'
            }`}>
              {formatCurrency(data.summary?.balance)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Fee Breakdown Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-100">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('fee_details')}</h2>
        </div>

        {data.fees?.length === 0 ? (
          <div className="p-8 text-center">
            <CurrencyDollarIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">{t('no_fees_assigned')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-300">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('fee_type')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('amount')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('paid_col')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('due_date')}</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-100">
                {data.fees?.map((fee) => {
                  const instRows = getInstallmentRows(fee)

                  // Fee with installment plan → show a header row + one row per installment
                  if (instRows) {
                    return (
                      <Fragment key={fee.id}>
                        {/* Plan header row */}
                        <tr className="bg-blue-50 dark:bg-blue-900/20">
                          <td className="px-6 py-3" colSpan={4}>
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-900 dark:text-white">{fee.fee_type?.name || t('fee_type')}</span>
                              <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">
                                {t(fee.installment_plan.plan_type === 'monthly' ? 'monthly' : 'quarterly')} — {fee.installment_plan.periods} {t('installments')} — {t('total')} : {formatCurrency(fee.amount)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-3" colSpan={2}>
                            <div className="text-right text-xs text-gray-500">
                              {t('paid')} : <span className="text-green-600 font-medium">{formatCurrency(fee.paid_amount)}</span>
                              {' · '}{t('remaining')} : <span className="text-red-600 font-medium">{formatCurrency(parseFloat(fee.amount) - parseFloat(fee.paid_amount || 0))}</span>
                            </div>
                          </td>
                        </tr>
                        {/* Individual installment rows */}
                        {instRows.map((inst) => {
                          const instBalance = parseFloat(inst.amount) - inst.effectivePaid
                          const isOverdue = !inst.isPaid && inst.due_date && new Date(inst.due_date).setHours(0,0,0,0) < today.getTime()
                          const isNext = !inst.isPaid && instRows.filter(r => !r.isPaid)[0]?.number === inst.number
                          return (
                            <tr key={`inst-${fee.id}-${inst.number}`} className={`transition-colors ${inst.isPaid ? 'opacity-60' : isNext ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                              <td className="px-6 py-3 pl-10">
                                <div className="flex items-center gap-2">
                                  {inst.isPaid
                                    ? <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    : isOverdue
                                      ? <ExclamationCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                                      : <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  }
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {t('installment')} {inst.number}
                                    {isNext && <span className="ml-2 text-xs font-semibold text-orange-600 dark:text-orange-400">{t('next_due_label')}</span>}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(inst.amount)}</td>
                              <td className="px-6 py-3 text-right text-sm text-green-600">{formatCurrency(inst.effectivePaid)}</td>
                              <td className={`px-6 py-3 text-right text-sm font-medium ${instBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(instBalance)}</td>
                              <td className="px-6 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
                                <span className={isOverdue ? 'text-red-600' : ''}>
                                  {new Date(inst.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                  inst.isPaid ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                }`}>
                                  {inst.isPaid ? t('paid') : isOverdue ? t('overdue') : t('pending')}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  }

                  // Regular fee (no installment plan)
                  const statusConfig = getStatusConfig(fee.status)
                  const feeBalance = (fee.amount || 0) - (fee.paid_amount || 0)
                  const isOverdue = fee.due_date && new Date(fee.due_date) < new Date() && feeBalance > 0
                  return (
                    <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">{fee.fee_type?.name || t('fee_type')}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(fee.amount)}</td>
                      <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{formatCurrency(fee.paid_amount)}</td>
                      <td className={`px-6 py-4 text-right font-medium ${feeBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(feeBalance)}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                        {fee.due_date ? (
                          <span className={isOverdue ? 'text-red-600 dark:text-red-400' : ''}>
                            {new Date(fee.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${isOverdue ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : `${statusConfig.bg} ${statusConfig.text}`}`}>
                          {isOverdue ? t('overdue') : statusConfig.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Payment History — all years */}
      {allPaymentsHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-100">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('payment_history')}</h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-dark-100">
            {allPaymentsHistory.slice(0, 20).map((payment) => (
              <div key={payment.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {payment.reference_number}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(payment.payment_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })} • {(payment.payment_method || 'espèces').replace('_', ' ')}
                      {payment.student_fee?.fee_type?.name && (
                        <span className="ml-1">• {payment.student_fee.fee_type.name}</span>
                      )}
                      {payment.student_fee?.academic_year && (
                        <span className="ml-1 text-gray-400">({payment.student_fee.academic_year})</span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  +{formatCurrency(payment.amount)}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

    </div>
  )
}
