import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { studentFeeApi, studentApi, feeTypeApi } from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useI18n } from '../../i18n/index.jsx'

const CURRENT_YEAR = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
const emptyFee  = { student_id: '', fee_type_id: '', amount: '', due_date: '', academic_year: CURRENT_YEAR }
const emptyPlan = { plan_type: 'monthly', periods: 3, start_date: '' }

export default function FinanceStudentFees() {
  const { t, language } = useI18n()

  // ── Data ──────────────────────────────────────────────────────
  const [fees, setFees]               = useState([])
  const [students, setStudents]       = useState([])
  const [feeTypes, setFeeTypes]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const studentsLoadedRef = useRef(false)

  // ── Student detail modal ──────────────────────────────────────
  const [detailOpen, setDetailOpen]           = useState(false)
  const [detailData, setDetailData]           = useState(null)   // { student, fees (with payments) }
  const [detailLoading, setDetailLoading]     = useState(false)

  // ── Inline plan form (within detail modal) ────────────────────
  const [planFeeId, setPlanFeeId]   = useState(null)  // id of fee being planned
  const [planData, setPlanData]     = useState(emptyPlan)
  const [planSaving, setPlanSaving] = useState(false)

  // ── Assign fee modal ──────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false)
  const [formData, setFormData]     = useState(emptyFee)
  const [saving, setSaving]         = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [feeRes, typeRes] = await Promise.all([
        studentFeeApi.getAll({ per_page: 200 }),
        feeTypeApi.getAll({ active_only: true }),
      ])
      setFees(feeRes.data.data.data || feeRes.data.data)
      setFeeTypes(typeRes.data.data)
    } catch { toast.error(t('error')) } finally { setLoading(false) }
  }

  // Lazy-load students only when the assign modal opens
  const fetchStudentsOnce = async () => {
    if (studentsLoadedRef.current) return
    setStudentsLoading(true)
    try {
      const res = await studentApi.getAll({ per_page: 500 })
      setStudents(res.data.data.data || res.data.data)
      studentsLoadedRef.current = true
    } catch { toast.error(t('error')) } finally { setStudentsLoading(false) }
  }

  // ── Group fees by student ──────────────────────────────────────
  const studentRows = useMemo(() => {
    const map = {}
    fees.forEach(fee => {
      if (!fee.student) return
      const sid = fee.student.id
      if (!map[sid]) map[sid] = { id: sid, student_id: fee.student.student_id, student: fee.student, fees: [] }
      map[sid].fees.push(fee)
    })
    return Object.values(map)
  }, [fees])

  // ── Helpers ──────────────────────────────────────────────────
  const fmt = (v) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'fr-FR').format(v || 0) + ' FCFA'
  const isReg = (f) => f.fee_type?.category === 'registration'
  const bal   = (f) => parseFloat(f.amount || 0) - parseFloat(f.paid_amount || 0)

  /** Compute installment paid status dynamically from paid_amount (handles overpayments) */
  const getInstStatuses = (fee) => {
    if (!fee.installment_plan?.installments) return []
    const plan     = fee.installment_plan
    const basePaid = parseFloat(plan.base_paid_amount ?? 0)
    let rem        = Math.max(0, parseFloat(fee.paid_amount || 0) - basePaid)
    return plan.installments.map(inst => {
      const amt = parseFloat(inst.amount)
      if (rem >= amt) { rem -= amt; return { ...inst, isPaid: true,  leftover: 0 } }
      const partial = rem; rem = 0
      return { ...inst, isPaid: false, leftover: amt - partial }
    })
  }

  /** Compute summary for a student row */
  const summary = (row) => {
    const reg     = row.fees.find(f => isReg(f))
    const tuition = row.fees.filter(f => !isReg(f))
    const total   = tuition.reduce((s, f) => s + parseFloat(f.amount || 0), 0)
    const paid    = tuition.reduce((s, f) => s + parseFloat(f.paid_amount || 0), 0)
    return { reg, tuition, total, balance: total - paid, hasPlan: tuition.some(f => f.installment_plan) }
  }

  // ── Open student detail ───────────────────────────────────────
  const openDetail = async (row) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setPlanFeeId(null)
    setPlanData(emptyPlan)
    try {
      const res = await studentFeeApi.getByStudent(row.student.id)
      setDetailData({ student: row.student, fees: res.data.data.fees || [] })
    } catch { toast.error(t('error')) } finally { setDetailLoading(false) }
  }

  const refreshDetail = async () => {
    if (!detailData) return
    try {
      const res = await studentFeeApi.getByStudent(detailData.student.id)
      setDetailData(prev => ({ ...prev, fees: res.data.data.fees || [] }))
    } catch { /* silent */ }
  }

  const closeDetail = () => { setDetailOpen(false); setDetailData(null); setPlanFeeId(null) }

  // ── Plan submit ───────────────────────────────────────────────
  const handlePlanSubmit = async (e) => {
    e.preventDefault()
    if (!planFeeId) return
    setPlanSaving(true)
    try {
      const res = await studentFeeApi.setInstallmentPlan(planFeeId, planData)
      toast.success(t('plan_defined_success').replace('{n}', planData.periods))
      const updated = res.data.data
      setFees(prev => prev.map(f => f.id === updated.id ? { ...f, installment_plan: updated.installment_plan } : f))
      await refreshDetail()
      setPlanFeeId(null)
      setPlanData(emptyPlan)
    } catch (err) { toast.error(err.response?.data?.message || t('error')) }
    finally { setPlanSaving(false) }
  }

  // ── Assign fee submit ─────────────────────────────────────────
  const handleAssignSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await studentFeeApi.create(formData)
      toast.success(t('fee_assigned'))
      setAssignOpen(false)
      setFormData(emptyFee)
      fetchData()
      if (detailData && String(formData.student_id) === String(detailData.student.id)) {
        await refreshDetail()
      }
    } catch (err) { toast.error(err.response?.data?.message || t('error')) }
    finally { setSaving(false) }
  }

  const handleFeeTypeChange = (ftId) => {
    const ft = feeTypes.find(f => f.id.toString() === ftId)
    setFormData(p => ({ ...p, fee_type_id: ftId, amount: ft?.amount || '' }))
  }

  // ── Plan preview amount ───────────────────────────────────────
  const planFeeObj  = detailData?.fees.find(f => f.id === planFeeId)
  const planBal     = planFeeObj ? bal(planFeeObj) : 0
  const planPreview = planBal > 0 && planData.periods > 0
    ? Math.round(planBal / parseInt(planData.periods))
    : 0

  // ── Table columns (student-centric) ───────────────────────────
  const columns = [
    {
      header: t('student'),
      accessor: row => `${row.student?.user?.first_name} ${row.student?.user?.last_name}`,
      cell: row => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
            {row.student?.user?.first_name?.[0]}{row.student?.user?.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.student?.user?.first_name} {row.student?.user?.last_name}</p>
            <p className="text-xs text-gray-500">{row.student?.student_id}</p>
          </div>
        </div>
      ),
    },
    { header: t('level'), accessor: row => row.student?.level },
    {
      header: t('registration_fee'),
      cell: row => {
        const { reg } = summary(row)
        if (!reg) return <span className="text-xs text-gray-400">—</span>
        return bal(reg) <= 0
          ? <span className="badge badge-success text-xs">{t('paid')}</span>
          : <span className="badge badge-danger text-xs">{t('unpaid')}</span>
      },
    },
    {
      header: t('tuition_balance_col'),
      cell: row => {
        const s = summary(row)
        return (
          <div>
            <p className={`font-semibold text-sm ${s.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(s.balance)}</p>
            <p className="text-xs text-gray-400">/ {fmt(s.total)}</p>
          </div>
        )
      },
    },
    {
      header: t('installment_plan'),
      cell: row => {
        const { hasPlan, tuition } = summary(row)
        if (!hasPlan) return <span className="text-xs text-gray-400">—</span>
        const pf = tuition.find(f => f.installment_plan)
        return <span className="badge badge-info text-xs">{pf?.installment_plan?.periods} {t('installments')}</span>
      },
    },
    {
      header: t('status'),
      cell: row => {
        const s = summary(row)
        if (s.balance <= 0 && (!s.reg || bal(s.reg) <= 0)) return <span className="badge badge-success">{t('settled')}</span>
        if (s.balance > 0) return <span className="badge badge-warning">{t('pending')}</span>
        return <span className="badge badge-info">{t('partial')}</span>
      },
    },
  ]

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('student_fees_title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('student_fees_subtitle')}</p>
        </div>
        <button onClick={() => { setAssignOpen(true); fetchStudentsOnce() }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" /> {t('assign_fee')}
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <DataTable
          columns={columns}
          data={studentRows}
          loading={loading}
          searchPlaceholder={t('search')}
          onRowClick={openDetail}
        />
      </motion.div>

      {/* ══ Student detail modal ══ */}
      <Modal isOpen={detailOpen} onClose={closeDetail} title={t('financial_file')} size="xl">
        {detailLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : detailData && (
          <div className="space-y-8">

            {/* Student header */}
            <div className="flex items-center gap-4 pb-5 border-b border-gray-200 dark:border-dark-100">
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {detailData.student?.user?.first_name?.[0]}{detailData.student?.user?.last_name?.[0]}
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {detailData.student?.user?.first_name} {detailData.student?.user?.last_name}
                </p>
                <p className="text-sm text-gray-500">{detailData.student?.student_id} · {t('level')} {detailData.student?.level}</p>
              </div>
            </div>

            {/* Registration fee */}
            {(() => {
              const regFee = detailData.fees.find(f => isReg(f))
              if (!regFee) return null
              const b = bal(regFee)
              return (
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('registration_fee')}</p>
                  <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{regFee.fee_type?.name}</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400">{t('not_included_in_tuition_total')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">{fmt(regFee.amount)}</p>
                      {b <= 0
                        ? <p className="text-xs text-green-600">{t('paid_in_full')}</p>
                        : <p className="text-xs text-red-600 font-medium">{t('balance_due')}: {fmt(b)}</p>
                      }
                    </div>
                  </div>
                </section>
              )
            })()}

            {/* Tuition fees */}
            {(() => {
              const tuition = detailData.fees.filter(f => !isReg(f))
              if (tuition.length === 0) return null
              return (
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('tuition_fees')}</p>
                  <div className="space-y-4">
                    {tuition.map(fee => {
                      const b          = bal(fee)
                      const instRows   = getInstStatuses(fee)
                      const isPlanning = planFeeId === fee.id

                      return (
                        <div key={fee.id} className="rounded-xl border border-gray-200 dark:border-dark-100 overflow-hidden">
                          {/* Fee summary bar */}
                          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-dark-300">
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{fee.fee_type?.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {t('total')} {fmt(fee.amount)} · {t('paid')} <span className="text-green-600">{fmt(fee.paid_amount)}</span>
                                {b > 0 && <> · {t('balance')} <span className="text-red-600 font-semibold">{fmt(b)}</span></>}
                              </p>
                            </div>
                            {b <= 0
                              ? <span className="badge badge-success text-xs">{t('settled')}</span>
                              : <span className="badge badge-warning text-xs">{t('pending')}</span>
                            }
                          </div>

                          {/* Plan section */}
                          <div className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('installment_plan')}</p>
                              {b > 0 && (
                                <button
                                  onClick={() => { setPlanFeeId(isPlanning ? null : fee.id); setPlanData(emptyPlan) }}
                                  className="text-xs text-primary-600 hover:text-primary-700 border border-primary-200 rounded px-2 py-0.5 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                                >
                                  {fee.installment_plan ? t('edit') : t('define_plan')}
                                </button>
                              )}
                            </div>

                            {/* Inline plan form */}
                            {isPlanning && (
                              <form onSubmit={handlePlanSubmit} className="mb-3 p-3 rounded-xl bg-gray-50 dark:bg-dark-300 border border-gray-200 dark:border-dark-100 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="label text-xs">{t('type')}</label>
                                    <select value={planData.plan_type} onChange={e => setPlanData(p => ({ ...p, plan_type: e.target.value }))} className="input text-sm">
                                      <option value="monthly">{t('monthly_plan')}</option>
                                      <option value="quarterly">{t('quarterly_plan')}</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="label text-xs">{t('installments')}</label>
                                    <input type="number" value={planData.periods} onChange={e => setPlanData(p => ({ ...p, periods: parseInt(e.target.value) || 2 }))} className="input text-sm" min="2" max="24" required />
                                  </div>
                                </div>
                                <div>
                                  <label className="label text-xs">{t('first_installment_date')}</label>
                                  <input type="date" value={planData.start_date} onChange={e => setPlanData(p => ({ ...p, start_date: e.target.value }))} className="input text-sm" required />
                                </div>
                                {planPreview > 0 && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    ≈ {fmt(planPreview)} × {planData.periods} {t('installments')} ({planData.plan_type === 'monthly' ? t('monthly_plan') : t('quarterly_plan')})
                                  </p>
                                )}
                                <div className="flex gap-2">
                                  <button type="button" onClick={() => setPlanFeeId(null)} className="btn-secondary text-xs flex-1">{t('cancel')}</button>
                                  <button type="submit" disabled={planSaving} className="btn-primary text-xs flex-1">{planSaving ? t('saving') : t('confirm_plan')}</button>
                                </div>
                              </form>
                            )}

                            {/* Installment rows */}
                            {instRows.length > 0 ? (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-400 mb-1.5">
                                  {t('installment_plan_label')
                                    .replace('{plan}', fee.installment_plan.plan_type === 'monthly' ? t('monthly_plan') : t('quarterly_plan'))
                                    .replace('{n}', fee.installment_plan.periods)
                                  }
                                </p>
                                {instRows.map(inst => (
                                  <div key={inst.number} className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg ${inst.isPaid ? 'bg-green-50 dark:bg-green-900/10' : 'bg-gray-50 dark:bg-dark-300'}`}>
                                    <span className={inst.isPaid ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                                      {t('installment_number_short').replace('{n}', inst.number)} · {new Date(inst.due_date).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                                    </span>
                                    <span className={`font-semibold ${inst.isPaid ? 'text-green-600' : inst.leftover > 0 ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {inst.isPaid ? `${fmt(inst.amount)}` : fmt(inst.leftover)}
                                      {!inst.isPaid && inst.leftover > 0 && <span className="text-gray-400 font-normal"> {t('installment_remaining')}</span>}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">{t('no_plan_defined_short')}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })()}

            {/* Payment history */}
            {(() => {
              const allPayments = detailData.fees
                .flatMap(f => (f.payments || []).map(p => ({ ...p, feeName: f.fee_type?.name })))
                .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))

              return (
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t('payment_history')}</p>
                  {allPayments.length === 0 ? (
                    <p className="text-sm text-gray-400 italic text-center py-6">{t('no_payments_recorded')}</p>
                  ) : (
                    <div className="rounded-xl border border-gray-200 dark:border-dark-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-dark-300 text-xs text-gray-500 dark:text-gray-400">
                            <th className="px-4 py-2.5 text-left font-medium">{t('reference')}</th>
                            <th className="px-4 py-2.5 text-left font-medium">{t('fee_type')}</th>
                            <th className="px-4 py-2.5 text-left font-medium">{t('method')}</th>
                            <th className="px-4 py-2.5 text-left font-medium">{t('date')}</th>
                            <th className="px-4 py-2.5 text-right font-medium">{t('amount')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-100">
                          {allPayments.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors">
                              <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.reference_number}</td>
                              <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{p.feeName}</td>
                              <td className="px-4 py-2.5 text-gray-500 capitalize">{p.payment_method?.replace(/_/g, ' ')}</td>
                              <td className="px-4 py-2.5 text-gray-500">{new Date(p.payment_date).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-green-600">+{fmt(p.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )
            })()}
          </div>
        )}
      </Modal>

      {/* ══ Assign fee modal ══ */}
      <Modal isOpen={assignOpen} onClose={() => { setAssignOpen(false); setFormData(emptyFee) }} title={t('assign_fee')}>
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="label">{t('student')}</label>
            <select value={formData.student_id} onChange={e => setFormData(p => ({ ...p, student_id: e.target.value }))} className="input" required disabled={studentsLoading}>
              <option value="">{studentsLoading ? t('loading') : t('select_student')}</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.user?.first_name} {s.user?.last_name} ({s.student_id})</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('fee_type')}</label>
            <select value={formData.fee_type_id} onChange={e => handleFeeTypeChange(e.target.value)} className="input" required>
              <option value="">{t('select')}</option>
              {feeTypes.map(f => <option key={f.id} value={f.id}>{f.name} ({fmt(f.amount)})</option>)}
            </select>
          </div>
          <div>
            <label className="label">{t('amount')} (FCFA)</label>
            <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} className="input" required min="0" />
          </div>
          <div>
            <label className="label">{t('due_date')}</label>
            <input type="date" value={formData.due_date} onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))} className="input" required />
          </div>
          <div>
            <label className="label">{t('academic_year')}</label>
            <input type="text" value={formData.academic_year} onChange={e => setFormData(p => ({ ...p, academic_year: e.target.value }))} className="input" required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setAssignOpen(false); setFormData(emptyFee) }} className="btn-secondary">{t('cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? t('saving') : t('assign')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
