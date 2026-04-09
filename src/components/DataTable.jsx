import { useState } from 'react'
import { useI18n } from '../i18n/index.jsx'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'

export default function DataTable({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search...',
  pagination = true,
  pageSize = 10,
  actions,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  onRowClick,
  rowClassName,
}) {
  const { t } = useI18n()
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter data based on search
  const filteredData = searchable && searchTerm
    ? data.filter((row) => {
        const term = searchTerm.toLowerCase()
        // Search through columns that have accessors
        const matchesColumn = columns.some((col) => {
          const value = col.accessor ? (typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]) : ''
          return value?.toString().toLowerCase().includes(term)
        })
        if (matchesColumn) return true
        // Also search common nested fields for rows without accessors
        const searchableValues = [
          row.user?.first_name, row.user?.last_name, row.user?.email,
          row.student_id, row.employee_id, row.name, row.code, row.title,
          row.department?.name, row.status, row.level,
        ].filter(Boolean)
        return searchableValues.some(v => v.toString().toLowerCase().includes(term))
      })
    : data

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = pagination ? filteredData.slice(startIndex, startIndex + pageSize) : filteredData

  const handleExportCSV = () => {
    const exportCols = columns.filter(col => !col.hidden && !col.noExport)
    const headers = exportCols.map((col) => col.header).join(',')
    const rows = data.map((row) =>
      exportCols.map((col) => {
        let value = ''
        if (col.exportValue) {
          value = col.exportValue(row) ?? ''
        } else if (col.accessor) {
          value = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]
        }
        return `"${String(value ?? '').replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'export.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {searchable && (
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-100 bg-white dark:bg-dark-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {t('export')}
          </button>
          {actions}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.filter(col => !col.hidden).map((col) => (
                <th key={col.header} className={col.className}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-gray-500">
                  {emptyIcon && <div className="flex justify-center mb-3">{emptyIcon}</div>}
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <motion.tr
                  key={row.id || rowIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: rowIndex * 0.05 }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-300' : ''} ${rowClassName ? rowClassName(row) : ''}`}
                >
                  {columns.filter(col => !col.hidden).map((col) => (
                    <td key={col.header} className={col.className}>
                      {col.cell
                        ? col.cell(row)
                        : col.accessor
                        ? typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : row[col.accessor]
                        : null}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredData.length)} of{' '}
            {filteredData.length} results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page
              if (totalPages <= 5) {
                page = i + 1
              } else if (currentPage <= 3) {
                page = i + 1
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i
              } else {
                page = currentPage - 2 + i
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-primary-500 text-white'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-100'
                  }`}
                >
                  {page}
                </button>
              )
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
