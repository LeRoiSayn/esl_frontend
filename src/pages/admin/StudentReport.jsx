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
        <div className="flex items-start justify-between gap-4">
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

        <div className="mt-6 space-y-6">
          {(report.finance?.years || []).length === 0 ? (
            <div className="text-sm text-gray-500">No financial data.</div>
          ) : (
            report.finance.years.map((y) => (
              <div key={y.academic_year} className="border border-gray-200 dark:border-dark-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-dark-300 flex items-center justify-between">
                  <div className="font-semibold">{y.academic_year}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Total: {formatMoney(y.summary.total)} • Paid: {formatMoney(y.summary.paid)} • Balance: {formatMoney(y.summary.balance)}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white dark:bg-dark-200">
                      <tr className="text-left text-gray-500">
                        <th className="px-4 py-2">Fee</th>
                        <th className="px-4 py-2">Amount</th>
                        <th className="px-4 py-2">Paid</th>
                        <th className="px-4 py-2">Balance</th>
                        <th className="px-4 py-2">Due</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-100">
                      {y.fees.map((f) => (
                        <tr key={f.id} className="text-gray-700 dark:text-gray-200">
                          <td className="px-4 py-2">{f.fee_type}</td>
                          <td className="px-4 py-2">{formatMoney(f.amount)}</td>
                          <td className="px-4 py-2">{formatMoney(f.paid)}</td>
                          <td className="px-4 py-2">{formatMoney(f.balance)}</td>
                          <td className="px-4 py-2">{f.due_date || '—'}</td>
                          <td className="px-4 py-2">{f.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Optional: list of payment transactions (student online payments) */}
                {(y.transactions || []).length > 0 && (
                  <div className="p-4 border-t border-gray-200 dark:border-dark-100">
                    <div className="font-medium text-sm mb-2">Online Transactions</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                      {y.transactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between gap-4">
                          <span className="font-mono">{tx.reference}</span>
                          <span>{tx.payment_method}</span>
                          <span>{formatMoney(tx.amount)}</span>
                          <span className="text-gray-400">{formatDate(tx.created_at)}</span>
                        </div>
                      ))}
                    </div>
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

