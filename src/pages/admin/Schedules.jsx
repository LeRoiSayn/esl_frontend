import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { scheduleApi, classApi } from '../../services/api'
import { useI18n } from '../../i18n/index.jsx'
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const DAY_COLORS = {
  monday: 'from-blue-500/10 to-blue-600/10 border-blue-300 dark:border-blue-800',
  tuesday: 'from-purple-500/10 to-purple-600/10 border-purple-300 dark:border-purple-800',
  wednesday: 'from-green-500/10 to-green-600/10 border-green-300 dark:border-green-800',
  thursday: 'from-orange-500/10 to-orange-600/10 border-orange-300 dark:border-orange-800',
  friday: 'from-pink-500/10 to-pink-600/10 border-pink-300 dark:border-pink-800',
  saturday: 'from-teal-500/10 to-teal-600/10 border-teal-300 dark:border-teal-800',
}

export default function AdminSchedules() {
  const { t } = useI18n()
  const [schedules, setSchedules] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [formData, setFormData] = useState({
    class_id: '',
    day_of_week: 'monday',
    start_time: '08:00',
    end_time: '10:00',
    room: '',
    midterm_date: '',
    final_date: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [schedRes, classRes] = await Promise.all([
        scheduleApi.getAll(),
        classApi.getAll({ per_page: 200 }),
      ])
      setSchedules(schedRes.data.data || [])
      const classData = classRes.data.data
      setClasses(classData?.data || classData || [])
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSchedule) {
        await scheduleApi.update(editingSchedule.id, formData)
        toast.success(t('schedule_saved'))
      } else {
        await scheduleApi.create(formData)
        toast.success(t('schedule_created'))
      }
      setShowModal(false)
      setEditingSchedule(null)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      class_id: schedule.class_id?.toString() || '',
      day_of_week: schedule.day_of_week,
      start_time: schedule.start_time?.substring(0, 5) || '08:00',
      end_time: schedule.end_time?.substring(0, 5) || '10:00',
      room: schedule.room || '',
      midterm_date: schedule.midterm_date || '',
      final_date: schedule.final_date || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm(t('delete_schedule_confirm'))) return
    try {
      await scheduleApi.delete(id)
      toast.success(t('schedule_deleted'))
      fetchData()
    } catch (error) {
      toast.error(t('error'))
    }
  }

  const resetForm = () => {
    setFormData({
      class_id: '',
      day_of_week: 'monday',
      start_time: '08:00',
      end_time: '10:00',
      room: '',
      midterm_date: '',
      final_date: '',
    })
  }

  const openCreateModal = () => {
    setEditingSchedule(null)
    resetForm()
    setShowModal(true)
  }

  // Group schedules by day
  const groupedByDay = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter((s) => s.day_of_week === day)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-gray-100 dark:bg-dark-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-gray-100 dark:bg-dark-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t('schedules')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('schedules_subtitle')}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary inline-flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          {t('add_schedule')}
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary-600">{schedules.length}</p>
          <p className="text-sm text-gray-500">{t('total_schedules')}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {new Set(schedules.map((s) => s.class_id)).size}
          </p>
          <p className="text-sm text-gray-500">{t('planned_classes')}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {new Set(schedules.map((s) => s.day_of_week)).size}
          </p>
          <p className="text-sm text-gray-500">{t('active_days')}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">
            {new Set(schedules.filter((s) => s.room).map((s) => s.room)).size}
          </p>
          <p className="text-sm text-gray-500">{t('rooms_used')}</p>
        </div>
      </motion.div>

      {/* Schedule Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {DAYS.map((day) => (
          <div key={day} className="card overflow-hidden">
            <div className={`px-5 py-3 bg-gradient-to-r ${DAY_COLORS[day]} border-b`}>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary-500" />
                {t(day)}
                <span className="text-sm font-normal text-gray-500 ml-auto">
                  {groupedByDay[day].length} {t('courses_label')}
                </span>
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {groupedByDay[day].length > 0 ? (
                groupedByDay[day]
                  .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                  .map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-dark-300 border border-gray-200 dark:border-dark-100 group hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {schedule.class?.course?.name || t('course')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {schedule.class?.course?.code} • {schedule.class?.name}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(schedule)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-100"
                          >
                            <PencilIcon className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(schedule.id)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                          >
                            <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {schedule.start_time?.substring(0, 5)} - {schedule.end_time?.substring(0, 5)}
                        </span>
                        {schedule.room && (
                          <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <MapPinIcon className="w-3.5 h-3.5" />
                            {schedule.room}
                          </span>
                        )}
                      </div>
                      {schedule.class?.teacher?.user && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                           {schedule.class.teacher.user.first_name} {schedule.class.teacher.user.last_name}
                        </p>
                      )}
                      {(schedule.midterm_date || schedule.final_date) && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {schedule.midterm_date && (
                            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                               {t('midterm_exam')}: {schedule.midterm_date}
                            </span>
                          )}
                          {schedule.final_date && (
                            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full">
                               {t('final_exam')}: {schedule.final_date}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                  {t('no_classes_for_day')}
                </p>
              )}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-200 dark:border-dark-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingSchedule ? t('edit_schedule') : t('add_schedule')}
                </h2>
                <button
                  onClick={() => { setShowModal(false); setEditingSchedule(null) }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Class selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('schedule_class_label')} *
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">{t('select_class')}</option>
                    {classes
                      .filter((c) => c.is_active)
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.course?.name || cls.name} ({cls.course?.code || ''}) - {cls.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Day */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('schedule_day_label')} *
                  </label>
                  <select
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
                    required
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>{t(day)}</option>
                    ))}
                  </select>
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('start_time')} *
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t('end_time')} *
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Room */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('room')}
                  </label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder={t('room')}
                    className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>

                {/* Exam dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      📝 {t('midterm_date')}
                    </label>
                    <input
                      type="date"
                      value={formData.midterm_date}
                      onChange={(e) => setFormData({ ...formData, midterm_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      🎓 {t('final_date')}
                    </label>
                    <input
                      type="date"
                      value={formData.final_date}
                      onChange={(e) => setFormData({ ...formData, final_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setEditingSchedule(null) }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-200 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                  >
                    {editingSchedule ? t('update') : t('create')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
