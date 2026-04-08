import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { academicLevelApi } from '../../services/api'
import { useI18n } from '../../i18n/index.jsx'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'

export default function AcademicLevels() {
  const { t } = useI18n()
  const [levels, setLevels]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [deleting, setDeleting]     = useState(null)
  const [editing, setEditing]       = useState(null)
  const [formData, setFormData]     = useState({ code: '', label: '', order: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchLevels() }, [])

  const fetchLevels = async () => {
    try {
      const res = await academicLevelApi.getAll()
      setLevels(res.data.data)
    } catch {
      toast.error(t('levels_load_error'))
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setFormData({ code: '', label: '', order: levels.length + 1 })
    setModalOpen(true)
  }

  const openEdit = (level) => {
    setEditing(level)
    setFormData({ code: level.code, label: level.label, order: level.order })
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editing) {
        await academicLevelApi.update(editing.id, formData)
        toast.success(t('updated'))
      } else {
        await academicLevelApi.create(formData)
        toast.success(t('created'))
      }
      setModalOpen(false)
      fetchLevels()
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (level) => {
    try {
      await academicLevelApi.toggle(level.id)
      toast.success(level.is_active ? t('disabled') : t('enabled'))
      fetchLevels()
    } catch {
      toast.error(t('error'))
    }
  }

  const handleDelete = async (level) => {
    if (!window.confirm(`${t('confirm_delete_level')} ${level.code}?`)) return
    setDeleting(level.id)
    try {
      await academicLevelApi.delete(level.id)
      toast.success(t('deleted'))
      fetchLevels()
    } catch (err) {
      toast.error(err.response?.data?.message || t('error'))
    } finally {
      setDeleting(null)
    }
  }

  const columns = [
    {
      key: 'code',
      label: t('code'),
      render: (level) => (
        <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
          {level.code}
        </span>
      ),
    },
    { key: 'label', label: t('label') },
    {
      key: 'order',
      label: t('order'),
      render: (level) => (
        <span className="text-gray-500 dark:text-gray-400">{level.order}</span>
      ),
    },
    {
      key: 'is_active',
      label: t('status'),
      render: (level) => (
        <button
          onClick={() => handleToggle(level)}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
            level.is_active
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
          }`}
        >
          {level.is_active ? t('active') : t('inactive')}
        </button>
      ),
    },
    {
      key: 'actions',
      label: t('actions'),
      render: (level) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(level)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(level)}
            disabled={deleting === level.id}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t('academic_levels_title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('academic_levels_subtitle')}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary-500 text-white font-medium text-sm hover:bg-primary-600 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          {t('new_level')}
        </button>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-dark-200 rounded-xl border border-gray-200 dark:border-dark-100"
      >
        <DataTable
          columns={columns}
          data={levels}
          loading={loading}
          emptyMessage={t('no_levels_configured')}
          emptyIcon={<AcademicCapIcon className="w-10 h-10 text-gray-300" />}
        />
      </motion.div>

      {/* Create / Edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `${t('edit')} ${editing.code}` : t('new_academic_level')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('code')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={formData.code}
              onChange={e => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder={t('level_code_placeholder')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('label')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.label}
              onChange={e => setFormData(p => ({ ...p, label: e.target.value }))}
              placeholder={t('level_label_placeholder')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('display_order')}
            </label>
            <input
              type="number"
              min={0}
              value={formData.order}
              onChange={e => setFormData(p => ({ ...p, order: Number(e.target.value) }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-dark-100 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-300 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-40 transition-colors"
            >
              {submitting ? t('saving') : editing ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
