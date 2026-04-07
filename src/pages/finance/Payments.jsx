import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { paymentApi, studentFeeApi, invalidateDashboardCache } from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import {
  PlusIcon, PencilIcon, MagnifyingGlassIcon,
  ChevronLeftIcon, CheckCircleIcon, ClockIcon, CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { useI18n } from '../../i18n/index.jsx'

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'mobile_money', 'check']
const emptyPayForm = {
  student_fee_id: '',
  amount: '',
  payment_method: 'cash',
  payment_date: new Date().toISOString().split('T')[0],
  notes: '',
}

export default function FinancePayments() {
  const { t } = useI18n()
  const [payments, setPayments] = useState([])
  const [allFees, setAllFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [feesLoading, setFeesLoading] = useState(false)
  const feesLoadedRef = useRef(false)

  // Record payment modal state
  // step: 'search' → 'fees' → 'form'
  const [modalOpen, setModalOpen] = useState(false)
  const [step, setStep] = useState('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedFee, setSelectedFee] = useState(null)

  // Payment form state
  const [payForm, setPayForm] = useState(emptyPayForm)
  const [paySubmitting, setPaySubmitting] = useState(false)

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [editData, setEditData] = useState({ amount: '', payment_method: 'cash', payment_date: '', notes: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const payRes = await paymentApi.getAll({ per_page: 100 })
      setPayments(payRes.data.data.data || payRes.data.data)
    } catch { toast.error(t('error')) } finally { setLoading(false) }
  }

  // Lazy-load unpaid fees only when the record-payment modal opens
  const fetchFeesOnce = async () => {
    if (feesLoadedRef.current) return
    setFeesLoading(true)
    try {
      const feeRes = await studentFeeApi.getAll({ per_page: 500 })
      const fees = feeRes.data.data.data || feeRes.data.data
      setAllFees(fees.filter(f => f.status !== 'paid'))
      feesLoadedRef.current = true
    } catch { toast.error(t('error')) } finally { setFeesLoading(false) }
  }

  // ── Derived data ──────────────────────────────────────────────
  const studentsWithFees = useMemo(() => {
    const map = {}
    allFees.forEach(fee => {
      const s = fee.student
      if (!s) return
      if (!map[s.id]) map[s.id] = { ...s, fees: [] }
      map[s.id].fees.push(fee)
    })
    return Object.values(map)
  }, [allFees])

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return studentsWithFees
    const q = searchQuery.toLowerCase()
    return studentsWithFees.filter(s =>
      s.student_id?.toLowerCase().includes(q) ||
      s.user?.first_name?.toLowerCase().includes(q) ||
      s.user?.last_name?.toLowerCase().includes(q)
    )
  }, [studentsWithFees, searchQuery])

  // ── Helpers ──────────────────────────────────────────────────
  const remaining = selectedFee ? parseFloat(selectedFee.amount) - parseFloat(selectedFee.paid_amount) : 0
  const getBalance = (fee) => parseFloat(fee.amount) - parseFloat(fee.paid_amount)
  const isRegistration = (fee) => fee.fee_type?.category === 'registration'
  const formatCurrency = (v) => new Intl.NumberFormat('fr-FR').format(v) + ' RWF'

  // ── Modal open/close ─────────────────────────────────────────
  const openModal = () => {
    setStep('search')
    setSearchQuery('')
    setSelectedStudent(null)
    setSelectedFee(null)
    setPayForm(emptyPayForm)
    setModalOpen(true)
    fetchFeesOnce()
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedStudent(null)
    setSelectedFee(null)
  }

  // ── Step navigation ───────────────────────────────────────────
  const selectStudent = (s) => { setSelectedStudent(s); setStep('fees') }

  const openPayForm = (fee) => {
    setSelectedFee(fee)
    let amount = getBalance(fee)
    if (fee.installment_plan?.installments) {
      const next = fee.installment_plan.installments.find(i => !i.paid)
      if (next) amount = next.amount
    }
    setPayForm({ ...emptyPayForm, student_fee_id: fee.id, amount: amount.toString() })
    setStep('form')
  }

  // ── Submissions ───────────────────────────────────────────────
  const handlePaySubmit = async (e) => {
    e.preventDefault()
    setPaySubmitting(true)
    try {
      await paymentApi.create(payForm)
      invalidateDashboardCache()
      toast.success(t('payment_recorded'))
      closeModal()
      feesLoadedRef.current = false  // force re-fetch on next modal open
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'))
    } finally {
      setPaySubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingPayment) return
    setEditSubmitting(true)
    try {
      await paymentApi.update(editingPayment.id, editData)
      invalidateDashboardCache()
      toast.success(t('payment_updated'))
      setEditModalOpen(false)
      setEditingPayment(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'))
    } finally {
      setEditSubmitting(false)
    }
  }

  const openEdit = (payment) => {
    setEditingPayment(payment)
    setEditData({
      amount: payment.amount,
      payment_method: payment.payment_method,
      payment_date: payment.payment_date?.split('T')[0] || payment.payment_date,
      notes: payment.notes || '',
    })
    setEditModalOpen(true)
  }

  // ── Modal title per step ──────────────────────────────────────
  const modalTitles = {
    search: t('record_payment'),
    fees: t('student_fees_title'),
    form: t('confirm_payment'),
  }

  // ── Table columns ─────────────────────────────────────────────
  const columns = [
    { header: t('reference'), cell: (row) => <span className="font-mono text-sm">{row.reference_number}</span> },
    { header: t('student'), cell: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-medium text-sm">
          {row.student_fee?.student?.user?.first_name?.[0]}{row.student_fee?.student?.user?.last_name?.[0]}
        </div>
        <div>
          <p className="font-medium">{row.student_fee?.student?.user?.first_name} {row.student_fee?.student?.user?.last_name}</p>
          <p className="text-sm text-gray-500">{row.student_fee?.fee_type?.name}</p>
        </div>
      </div>
    )},
    { header: t('amount'), cell: (row) => <span className="font-semibold text-green-600">{formatCurrency(row.amount)}</span> },
    { header: t('method'), cell: (row) => <span className="badge badge-info">{row.payment_method?.replace(/_/g, ' ')}</span> },
    { header: t('date'), accessor: (row) => new Date(row.payment_date).toLocaleDateString('fr-FR') },
    { header: t('received_by'), accessor: (row) => row.received_by?.first_name ? `${row.received_by.first_name} ${row.received_by.last_name}` : t('system') },
    { header: '', noExport: true, cell: (row) => (
      <button onClick={(e) => { e.stopPropagation(); openEdit(row) }}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 text-gray-500 hover:text-primary-600" title={t('edit')}>
        <PencilIcon className="w-4 h-4" />
      </button>
    )},
  ]

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('payments')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('payments_subtitle')}</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          {t('record_payment')}
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <DataTable columns={columns} data={payments} loading={loading} searchPlaceholder={t('search')} />
      </motion.div>

      {/* ══ Record Payment Modal ══ */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={modalTitles[step]} size="lg">

        {/* ── Step 1 : search student ── */}
        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input autoFocus type="text" placeholder={t('student_search_placeholder')}
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="input pl-10" />
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {feesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredStudents.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">{t('no_students_pending_fees')}</p>
              ) : filteredStudents.map(s => (
                <button key={s.id} onClick={() => selectStudent(s)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-dark-100 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {s.user?.first_name?.[0]}{s.user?.last_name?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{s.user?.first_name} {s.user?.last_name}</p>
                    <p className="text-xs text-gray-500">{s.student_id} · {s.fees.length} {t('pending_fees_count')}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2 : fee list ── */}
        {step === 'fees' && selectedStudent && (
          <div className="space-y-4">
            {/* Student header */}
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('search')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 text-gray-500">
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold text-sm">
                {selectedStudent.user?.first_name?.[0]}{selectedStudent.user?.last_name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedStudent.user?.first_name} {selectedStudent.user?.last_name}</p>
                <p className="text-xs text-gray-500">{selectedStudent.student_id}</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
              {selectedStudent.fees.map(fee => {
                const bal = getBalance(fee)
                const reg = isRegistration(fee)
                const plan = fee.installment_plan
                const nextInst = plan?.installments?.find(i => !i.paid)

                return (
                  <div key={fee.id} className={`rounded-xl border transition-colors ${
                    bal <= 0
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                      : 'border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-200'
                  }`}>
                    {/* Fee header row */}
                    <div className="p-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {bal <= 0
                          ? <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                          : <ClockIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        }
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900 dark:text-white">{fee.fee_type?.name}</span>
                            {reg && <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">{t('registration')}</span>}
                          </div>
                          {bal > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {t('balance_label')} : <span className="font-semibold text-red-600">{formatCurrency(bal)}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      {bal > 0 && (
                        <button onClick={() => openPayForm(fee)}
                          className="btn-primary text-xs flex-shrink-0 py-1.5 px-3">
                          {t('pay')}
                        </button>
                      )}
                      {bal <= 0 && <span className="text-sm font-semibold text-green-600 flex-shrink-0">{t('paid')}</span>}
                    </div>

                    {/* Installment plan section (read-only — manage in Frais des étudiants) */}
                    {bal > 0 && (
                      <div className="border-t border-gray-100 dark:border-dark-100 px-3 pb-3 pt-2">
                        <div className="flex items-center mb-2">
                          <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            {t('installment_plan')}
                          </span>
                        </div>

                        {plan?.installments ? (
                          <div className="grid grid-cols-1 gap-1">
                            {plan.installments.map(inst => (
                              <div key={inst.number}
                                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${
                                  inst.paid
                                    ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                                    : 'bg-gray-50 dark:bg-dark-300 text-gray-700 dark:text-gray-300'
                                }`}>
                                <span className="flex items-center gap-1.5">
                                  {inst.paid
                                    ? <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                    : <ClockIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  }
                                  {t('installment')} {inst.number} · {new Date(inst.due_date).toLocaleDateString('fr-FR')}
                                </span>
                                <span className="font-semibold">{formatCurrency(inst.amount)}</span>
                              </div>
                            ))}
                            {nextInst && (
                              <p className="text-xs text-primary-600 mt-1">
                                → {t('next_installment')} <strong>{formatCurrency(nextInst.amount)}</strong>
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            {t('no_plan_defined')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 3 : payment form ── */}
        {step === 'form' && selectedFee && (
          <form onSubmit={handlePaySubmit} className="space-y-4">
            {/* Context bar */}
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-300 border border-gray-200 dark:border-dark-100">
              <button type="button" onClick={() => setStep('fees')}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 mb-2">
                <ChevronLeftIcon className="w-3 h-3" /> {t('change_fee')}
              </button>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedStudent?.user?.first_name} {selectedStudent?.user?.last_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedFee.fee_type?.name} · {t('balance_label')} : <span className="text-red-600 font-medium">{formatCurrency(remaining)}</span>
                  </p>
                </div>
                {isRegistration(selectedFee) && (
                  <span className="badge bg-amber-50 text-amber-700 border border-amber-200 text-xs">{t('registration')}</span>
                )}
              </div>

              {/* Installment plan recap */}
              {selectedFee.installment_plan?.installments && (
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-dark-100">
                  <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                    {selectedFee.installment_plan.plan_type === 'monthly' ? t('monthly_plan') : t('quarterly_plan')} — {selectedFee.installment_plan.periods} {t('installments')}
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {selectedFee.installment_plan.installments.map(inst => (
                      <div key={inst.number}
                        className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${
                          inst.paid
                            ? 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                            : 'bg-white dark:bg-dark-200 text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-dark-100'
                        }`}>
                        <span className="flex items-center gap-1.5">
                          {inst.paid
                            ? <CheckCircleIcon className="w-3.5 h-3.5" />
                            : <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                          }
                          {t('installment')} {inst.number} · {new Date(inst.due_date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="font-medium">{formatCurrency(inst.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="label">{t('amount_rwf')}</label>
              <input type="number" value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                className="input" required min="1" max={remaining} />
            </div>
            <div>
              <label className="label">{t('payment_method_label')}</label>
              <select value={payForm.payment_method}
                onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}
                className="input" required>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ').toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('payment_date')}</label>
              <input type="date" value={payForm.payment_date}
                onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })}
                className="input" required />
            </div>
            <div>
              <label className="label">{t('notes')}</label>
              <textarea value={payForm.notes}
                onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                className="input" rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={closeModal} className="btn-secondary">{t('cancel')}</button>
              <button type="submit" disabled={paySubmitting} className="btn-primary">
                {paySubmitting ? t('saving') : t('confirm_payment')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ══ Edit Payment Modal ══ */}
      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingPayment(null) }} title={t('edit_payment')}>
        {editingPayment && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 dark:bg-dark-300 rounded-xl text-sm text-gray-600 dark:text-gray-400">
              <p><strong>{t('student')} :</strong> {editingPayment.student_fee?.student?.user?.first_name} {editingPayment.student_fee?.student?.user?.last_name}</p>
              <p><strong>{t('fee_type')} :</strong> {editingPayment.student_fee?.fee_type?.name}</p>
            </div>
            <div>
              <label className="label">{t('amount_rwf')}</label>
              <input type="number" value={editData.amount}
                onChange={e => setEditData({ ...editData, amount: e.target.value })}
                className="input" required min="1" />
            </div>
            <div>
              <label className="label">{t('payment_method_label')}</label>
              <select value={editData.payment_method}
                onChange={e => setEditData({ ...editData, payment_method: e.target.value })}
                className="input" required>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ').toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('date')}</label>
              <input type="date" value={editData.payment_date}
                onChange={e => setEditData({ ...editData, payment_date: e.target.value })}
                className="input" required />
            </div>
            <div>
              <label className="label">{t('notes')}</label>
              <textarea value={editData.notes}
                onChange={e => setEditData({ ...editData, notes: e.target.value })}
                className="input" rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setEditModalOpen(false); setEditingPayment(null) }} className="btn-secondary">{t('cancel')}</button>
              <button type="submit" disabled={editSubmitting} className="btn-primary">
                {editSubmitting ? t('saving') : t('save')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
