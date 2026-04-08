import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { systemSettingsApi } from '../../services/api'
import { useI18n } from '../../i18n/index.jsx'
import {
  BuildingOfficeIcon,
  AcademicCapIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  CheckIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const GROUP_ICONS = {
  institution: BuildingOfficeIcon,
  academic:    AcademicCapIcon,
  grading:     ChartBarIcon,
  payment:     CurrencyDollarIcon,
}

export default function SystemSettings() {
  const { t } = useI18n()
  const [grouped, setGrouped]     = useState({})
  const [flat, setFlat]           = useState({})
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [dirty, setDirty]         = useState({})
  const fileRef = useRef(null)

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    try {
      const res = await systemSettingsApi.getAll()
      setGrouped(res.data.data.grouped)
      setFlat(res.data.data.flat)
    } catch {
      toast.error(t('settings_load_error'))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setFlat(prev => ({ ...prev, [key]: value }))
    setDirty(prev => ({ ...prev, [key]: true }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await systemSettingsApi.update(flat)
      setDirty({})
      toast.success(t('saved'))
      fetchSettings()
    } catch {
      toast.error(t('settings_save_error'))
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('logo', file)
    setUploading(true)
    try {
      await systemSettingsApi.uploadLogo(form)
      toast.success(t('logo_updated'))
      fetchSettings()
    } catch {
      toast.error(t('upload_error'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const hasDirty = Object.keys(dirty).length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t('system_settings_title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('system_settings_subtitle')}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasDirty || saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 text-white font-medium text-sm disabled:opacity-40 hover:bg-primary-600 transition-colors"
        >
          <CheckIcon className="w-4 h-4" />
          {saving ? t('saving') : t('save')}
        </button>
      </div>

      {Object.entries(grouped).map(([group, settings]) => {
        const Icon = GROUP_ICONS[group] || BuildingOfficeIcon
        return (
          <motion.div
            key={group}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-dark-200 rounded-xl border border-gray-200 dark:border-dark-100 overflow-hidden"
          >
            {/* Group header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-dark-100">
              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary-500" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                {t(`system_settings_group_${group}`) || group}
              </h2>
            </div>

            {/* Settings list */}
            <div className="divide-y divide-gray-50 dark:divide-dark-100">
              {settings.map(s => (
                <SettingRow
                  key={s.key}
                  setting={s}
                  value={flat[s.key] ?? ''}
                  isDirty={!!dirty[s.key]}
                  onChange={val => handleChange(s.key, val)}
                  onLogoClick={s.key === 'institution_logo' ? () => fileRef.current?.click() : null}
                  uploading={uploading && s.key === 'institution_logo'}
                />
              ))}
            </div>
          </motion.div>
        )
      })}

      {/* Hidden file input for logo */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleLogoUpload}
      />
    </div>
  )
}

function SettingRow({ setting, value, isDirty, onChange, onLogoClick, uploading }) {
  const { t } = useI18n()
  const isLogo       = setting.key === 'institution_logo'
  const isInteger    = setting.type === 'integer'
  const isBoolean    = setting.type === 'boolean'
  const isThresholds = setting.key === 'grade_letter_thresholds'
  const isCategories = setting.key === 'fee_categories'

  return (
    <div className={`px-6 py-4 ${isThresholds || isCategories ? '' : 'flex items-center justify-between gap-4'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {setting.label || setting.key}
          </span>
          {isDirty && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
              {t('modified')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{setting.key}</p>
      </div>

      {isThresholds ? (
        <LetterThresholdsEditor value={Array.isArray(value) ? value : []} onChange={onChange} />
      ) : isCategories ? (
        <FeeCategoriesEditor value={Array.isArray(value) ? value : []} onChange={onChange} />
      ) : (
        <div className="w-64 flex-shrink-0">
          {isLogo ? (
            <button
              onClick={onLogoClick}
              disabled={uploading}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 text-sm text-gray-600 dark:text-gray-300 hover:border-primary-400 transition-colors"
            >
              <PhotoIcon className="w-4 h-4 text-gray-400" />
              {uploading ? t('uploading') : (value || t('choose_file'))}
            </button>
          ) : isBoolean ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!value}
                onChange={e => onChange(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {value ? t('enabled') : t('disabled')}
              </span>
            </label>
          ) : (
            <input
              type={isInteger ? 'number' : 'text'}
              value={value ?? ''}
              onChange={e => onChange(isInteger ? Number(e.target.value) : e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
            />
          )}
        </div>
      )}
    </div>
  )
}

// Editor for grade_letter_thresholds: table of {grade, min} pairs
function LetterThresholdsEditor({ value, onChange }) {
  const rows = [...value].sort((a, b) => b.min - a.min)

  const update = (index, field, val) => {
    const updated = rows.map((r, i) =>
      i === index ? { ...r, [field]: field === 'min' ? Number(val) : val } : r
    )
    onChange(updated)
  }

  const addRow = () => onChange([...rows, { grade: '', min: 0 }])

  const removeRow = (index) => onChange(rows.filter((_, i) => i !== index))

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 px-1">
        <span>Lettre</span>
        <span>Score minimum</span>
        <span />
      </div>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input
            type="text"
            value={row.grade}
            onChange={e => update(i, 'grade', e.target.value.toUpperCase())}
            maxLength={2}
            placeholder="A+"
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="number"
            value={row.min}
            onChange={e => update(i, 'min', e.target.value)}
            min={0}
            max={100}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => removeRow(i)}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        Ajouter un seuil
      </button>
      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        Tout score en dessous du seuil le plus bas = F. Les seuils sont triés automatiquement.
      </p>
    </div>
  )
}

// Editor for fee_categories: editable tag list
function FeeCategoriesEditor({ value, onChange }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const trimmed = draft.trim().toLowerCase().replace(/\s+/g, '_')
    if (!trimmed || value.includes(trimmed)) { setDraft(''); return }
    onChange([...value, trimmed])
    setDraft('')
  }

  const remove = (cat) => onChange(value.filter(c => c !== cat))

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map(cat => (
          <span
            key={cat}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-xs font-medium"
          >
            {cat}
            <button onClick={() => remove(cat)} className="hover:text-red-500 transition-colors">
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Nouvelle catégorie..."
          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-100 bg-gray-50 dark:bg-dark-300 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={add}
          className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-sm hover:bg-primary-600 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500">
        Les espaces sont convertis en underscores. Appuyez sur Entrée pour ajouter.
      </p>
    </div>
  )
}
