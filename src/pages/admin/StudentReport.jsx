import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline'
import { adminApi } from '../../services/api'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'

function formatMoney(amount) {
  const n = Number(amount || 0)
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA'
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('fr-FR')
  } catch {
    return String(iso)
  }
}

export default function AdminStudentReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const res = await adminApi.getStudentReport(id)
        setReport(res.data?.data)
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [id])

  const curriculumByLevelSemester = useMemo(() => {
    const items = report?.academic?.curriculum || []
    const map = {}
    for (const c of items) {
      const level = c.level || '—'
      const sem = c.semester || '—'
      map[level] ||= {}
      map[level][sem] ||= []
      map[level][sem].push(c)
    }
    return map
  }, [report])

  const printAll = () => window.print()

  const downloadSheet = async () => {
    try {
      const res = await adminApi.downloadStudentAcademicSheet(id)
      const blob = res.data
      const studentId = report?.student?.student_id ? String(report.student.student_id) : id
      const filename = `student-academic-sheet-${studentId}.html`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      toast.error('Failed to download report sheet')
    }
  }

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[320px]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!report) return null

  const student = report.student

  return (
    <div className="space-y-4">
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break { page-break-before: always; }
          .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        }
      `}</style>

      {/* Header actions */}
      <div className="no-print flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={downloadSheet} className="btn-secondary">
            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
            Download sheet
          </button>
          <button onClick={printAll} className="btn-primary">
            <PrinterIcon className="w-5 h-5 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Document 1: Academic Report */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 print-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Student Academic Report</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generated at: {formatDate(report.generated_at)}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600 dark:text-gray-300">
            <div className="font-semibold">{student.full_name}</div>
            <div>{student.student_id}</div>
            <div>{student.email}</div>
            <div>{student.department} • {student.level}{student.current_semester ? ` (S${student.current_semester})` : ''}</div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {Object.keys(curriculumByLevelSemester).length === 0 ? (
            <div className="text-sm text-gray-500">No curriculum data.</div>
          ) : (
            Object.entries(curriculumByLevelSemester).map(([level, semesters]) => (
              <div key={level} className="space-y-3">
                <h2 className="font-semibold text-gray-900 dark:text-white">{level}</h2>
                {Object.entries(semesters).map(([sem, courses]) => (
                  <div key={sem} className="border border-gray-200 dark:border-dark-100 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-dark-300 text-sm font-medium">
                      Semester {sem}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-white dark:bg-dark-200">
                          <tr className="text-left text-gray-500">
                            <th className="px-4 py-2">Code</th>
                            <th className="px-4 py-2">Course</th>
                            <th className="px-4 py-2">Credits</th>
                            <th className="px-4 py-2">Status</th>
                            <th className="px-4 py-2">Grade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-100">
                          {courses.map((c) => (
                            <tr key={c.course_id} className="text-gray-700 dark:text-gray-200">
                              <td className="px-4 py-2 font-mono">{c.code}</td>
                              <td className="px-4 py-2">{c.name}</td>
                              <td className="px-4 py-2">{c.credits}</td>
                              <td className="px-4 py-2">
                                {c.status === 'passed' ? 'Passed' :
                                  c.status === 'failed' ? 'Failed' :
                                  c.status === 'in_progress' ? 'In progress' :
                                  'Not taken'}
                              </td>
                              <td className="px-4 py-2">
                                {c.grade ? `${c.grade.final_grade}/100 ${c.grade.letter_grade ? `(${c.grade.letter_grade})` : ''}` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </motion.div>

      <div className="page-break" />

      {/* Document 2: Financial Report */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6 print-card">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-dark-100">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Student Financial Report</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Generated at: {formatDate(report.generated_at)}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600 dark:text-gray-300">
            <div className="font-semibold">{student.full_name}</div>
            <div>{student.student_id}</div>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          {(report.finance?.years || []).length === 0 ? (
            <div className="text-sm text-gray-500">No financial data.</div>
          ) : (
            report.finance.years.map((y) => (
              <div key={y.academic_year} className="border border-gray-200 dark:border-dark-100 rounded-lg overflow-hidden">
                {/* Year header with title */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-dark-300 border-b border-gray-200 dark:border-dark-100">
                  <div className="font-semibold text-gray-900 dark:text-white">{y.academic_year}</div>
                </div>
                {/* Summary strip */}
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-dark-100 border-b border-gray-200 dark:border-dark-100">
                  <div className="px-4 py-2.5">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">Total dû</div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white mt-0.5">{formatMoney(y.summary.total)}</div>
                  </div>
                  <div className="px-4 py-2.5">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">Payé</div>
                    <div className="font-semibold text-sm text-green-600 mt-0.5">{formatMoney(y.summary.paid)}</div>
                  </div>
                  <div className="px-4 py-2.5">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">Solde restant</div>
                    <div className={`font-semibold text-sm mt-0.5 ${Number(y.summary.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(y.summary.balance)}</div>
                  </div>
                </div>

                {/* Fees table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white dark:bg-dark-200">
                      <tr className="text-left text-gray-500 text-xs border-b border-gray-100 dark:border-dark-100">
                        <th className="px-4 py-2 font-medium">Frais</th>
                        <th className="px-4 py-2 font-medium text-right">Montant</th>
                        <th className="px-4 py-2 font-medium text-right">Payé</th>
                        <th className="px-4 py-2 font-medium text-right">Solde</th>
                        <th className="px-4 py-2 font-medium">Échéance</th>
                        <th className="px-4 py-2 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-100">
                      {y.fees.map((f) => {
                        const isPaid = f.status === 'paid'
                        const isPartial = f.status === 'partial'
                        return (
                          <tr key={f.id} className="text-gray-700 dark:text-gray-200">
                            <td className="px-4 py-2">{f.fee_type}</td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatMoney(f.amount)}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-green-600">{formatMoney(f.paid)}</td>
                            <td className={`px-4 py-2 text-right tabular-nums font-medium ${Number(f.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatMoney(f.balance)}</td>
                            <td className="px-4 py-2 text-gray-500">{f.due_date || '—'}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isPaid ? 'bg-green-50 text-green-700 border-green-200' :
                                isPartial ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {isPaid ? 'Payé' : isPartial ? 'Partiel' : f.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Payment transactions */}
                {(y.transactions || []).length > 0 && (
                  <div className="border-t border-gray-200 dark:border-dark-100">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-dark-300 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Transactions enregistrées
                    </div>
                    <table className="min-w-full text-sm">
                      <thead className="bg-white dark:bg-dark-200">
                        <tr className="text-left text-gray-500 text-xs border-b border-gray-100 dark:border-dark-100">
                          <th className="px-4 py-2 font-medium">Référence</th>
                          <th className="px-4 py-2 font-medium">Méthode</th>
                          <th className="px-4 py-2 font-medium text-right">Montant</th>
                          <th className="px-4 py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-dark-100">
                        {y.transactions.map((tx) => (
                          <tr key={tx.id} className="text-gray-700 dark:text-gray-200">
                            <td className="px-4 py-2 font-mono text-xs">{tx.reference}</td>
                            <td className="px-4 py-2 text-gray-500">{tx.payment_method}</td>
                            <td className="px-4 py-2 text-right tabular-nums text-green-600 font-medium">{formatMoney(tx.amount)}</td>
                            <td className="px-4 py-2 text-gray-400 text-xs">{formatDate(tx.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}

