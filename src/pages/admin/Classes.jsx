import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { classApi, courseApi, teacherApi, scheduleApi } from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { useI18n } from '../../i18n/index.jsx'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  UserIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const emptySlot = () => ({ day_of_week: 'monday', start_time: '08:00', end_time: '10:00', room: '', midterm_date: '', final_date: '' })

export default function AdminClasses() {
  const { t } = useI18n()
  const [classes, setClasses] = useState([])
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState(null)
  const [scheduleSlots, setScheduleSlots] = useState([])
  const [existingSchedules, setExistingSchedules] = useState([])
  const [formData, setFormData] = useState({
    course_id: '',
    teacher_id: '',
    section: 'A',
    room: '',
    capacity: '50',
    academic_year: getDefaultAcademicYear(),
    semester: '1',
  })

  function getDefaultAcademicYear() {
    const month = new Date().getMonth() + 1
    const year = new Date().getFullYear()
    return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
  }

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [classRes, courseRes, teacherRes] = await Promise.all([
        classApi.getAll({ per_page: 100 }),
        courseApi.getAll({ active_only: true, per_page: 100 }),
        teacherApi.getAll({ status: 'active', per_page: 100 }),
      ])
      setClasses(classRes.data.data.data || classRes.data.data)
      setCourses(courseRes.data.data.data || courseRes.data.data)
      setTeachers(teacherRes.data.data.data || teacherRes.data.data)
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = { ...formData, teacher_id: formData.teacher_id || null }

      let classId
      if (editingClass) {
        await classApi.update(editingClass.id, data)
        classId = editingClass.id
        toast.success(t('success'))
      } else {
        const res = await classApi.create(data)
        classId = res.data.data.id
        toast.success(t('success'))
      }

      // Save new schedule slots
      const slotPromises = scheduleSlots
        .filter(s => s.day_of_week && s.start_time && s.end_time)
        .map(slot => scheduleApi.create({ ...slot, class_id: classId }))

      // Delete removed existing schedules
      const removedIds = existingSchedules
        .filter(es => !scheduleSlots.find(s => s.id === es.id))
        .map(es => es.id)
      const deletePromises = removedIds.map(id => scheduleApi.delete(id))

      await Promise.all([...slotPromises, ...deletePromises])

      setModalOpen(false)
      setEditingClass(null)
      resetForm()
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const resetForm = () => {
    setFormData({
      course_id: '',
      teacher_id: '',
      section: 'A',
      room: '',
      capacity: '50',
      academic_year: getDefaultAcademicYear(),
      semester: '1',
    })
    setScheduleSlots([])
    setExistingSchedules([])
  }

  const handleEdit = async (cls) => {
    setEditingClass(cls)
    setFormData({
      course_id: cls.course_id,
      teacher_id: cls.teacher_id || '',
      section: cls.section,
      room: cls.room || '',
      capacity: cls.capacity.toString(),
      academic_year: cls.academic_year,
      semester: cls.semester,
    })
    // Load existing schedules for this class
    try {
      const res = await scheduleApi.getAll({ class_id: cls.id })
      const loaded = res.data.data || []
      setExistingSchedules(loaded)
      setScheduleSlots(loaded.map(s => ({
        id: s.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time?.substring(0, 5) || '08:00',
        end_time: s.end_time?.substring(0, 5) || '10:00',
        room: s.room || '',
        midterm_date: s.midterm_date || '',
        final_date: s.final_date || '',
      })))
    } catch {
      setScheduleSlots([])
      setExistingSchedules([])
    }
    setModalOpen(true)
  }

  const handleDelete = async (cls) => {
    if (!window.confirm(t('delete_class_confirm'))) return
    try {
      await classApi.delete(cls.id)
      toast.success(t('success'))
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const addSlot = () => setScheduleSlots(prev => [...prev, emptySlot()])
  const removeSlot = (idx) => setScheduleSlots(prev => prev.filter((_, i) => i !== idx))
  const updateSlot = (idx, field, value) => {
    setScheduleSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const columns = [
    {
      header: t('class'),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium">{row.course?.name}</p>
            <p className="text-sm text-gray-500">{row.course?.code} - {t('section_label')} {row.section}</p>
          </div>
        </div>
      ),
    },
    {
      header: t('teacher'),
      cell: (row) => row.teacher ? (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span>{row.teacher.user?.first_name} {row.teacher.user?.last_name}</span>
        </div>
      ) : (
        <span className="text-gray-400">{t('not_assigned_col')}</span>
      ),
    },
    {
      header: t('room'),
      cell: (row) => row.room || '-',
    },
    {
      header: t('students_enrolled_col'),
      cell: (row) => `${row.enrollments_count || 0}/${row.capacity}`,
    },
    {
      header: t('year_semester_col'),
      cell: (row) => (
        <span className="text-sm">
          {row.academic_year} / S{row.semester}
        </span>
      ),
    },
    {
      header: t('status'),
      cell: (row) => (
        <span className={`badge ${row.is_active ? 'badge-success' : 'badge-danger'}`}>
          {row.is_active ? t('class_active') : t('class_inactive')}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100 text-gray-600 dark:text-gray-400"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            {t('classes')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t('classes_subtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingClass(null)
            resetForm()
            setModalOpen(true)
          }}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          {t('add_class')}
        </button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <DataTable
          columns={columns}
          data={classes}
          loading={loading}
          searchPlaceholder={t('search_classes_placeholder')}
        />
      </motion.div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingClass(null)
        }}
        title={editingClass ? t('edit_class') : t('add_class')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Class fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t('course')}</label>
              <select
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                className="input"
                required
                disabled={!!editingClass}
              >
                <option value="">{t('select_course')}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('teacher_optional')}</label>
              <select
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="input"
              >
                <option value="">{t('select_teacher')}</option>
                {teachers.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.user?.first_name} {tc.user?.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('section')}</label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                className="input"
                placeholder="e.g., A"
                required
                maxLength={5}
              />
            </div>
            <div>
              <label className="label">{t('room')}</label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="input"
                placeholder="e.g., Room 101"
              />
            </div>
            <div>
              <label className="label">{t('capacity')}</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="input"
                placeholder="e.g., 50"
                min="1"
                required
              />
            </div>
            <div>
              <label className="label">{t('academic_year')}</label>
              <input
                type="text"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                className="input"
                placeholder="e.g., 2025-2026"
                required
                disabled={!!editingClass}
              />
            </div>
            <div>
              <label className="label">{t('semester')}</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="input"
                required
                disabled={!!editingClass}
              >
                <option value="1">{t('semester_1')}</option>
                <option value="2">{t('semester_2')}</option>
                <option value="3">{t('semester_3')}</option>
              </select>
            </div>
          </div>

          {/* Schedule section */}
          <div className="border-t border-gray-200 dark:border-dark-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{t('schedules')}</h3>
              </div>
              <button
                type="button"
                onClick={addSlot}
                className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
              >
                <PlusIcon className="w-4 h-4" />
                {t('add_schedule')}
              </button>
            </div>

            {scheduleSlots.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-3 bg-gray-50 dark:bg-dark-200 rounded-lg">
                {t('no_classes_scheduled')} — {t('add_schedule')}
              </p>
            )}

            <div className="space-y-3">
              {scheduleSlots.map((slot, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-dark-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label text-xs">{t('schedule_day_label')}</label>
                      <select
                        value={slot.day_of_week}
                        onChange={(e) => updateSlot(idx, 'day_of_week', e.target.value)}
                        className="input py-2 text-sm"
                      >
                        {DAYS.map(d => (
                          <option key={d} value={d}>{t(d)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">{t('start_time')}</label>
                      <input
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateSlot(idx, 'start_time', e.target.value)}
                        className="input py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">{t('end_time')}</label>
                      <input
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateSlot(idx, 'end_time', e.target.value)}
                        className="input py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="label text-xs">{t('room')}</label>
                      <input
                        type="text"
                        value={slot.room}
                        onChange={(e) => updateSlot(idx, 'room', e.target.value)}
                        className="input py-2 text-sm"
                        placeholder="e.g., Salle 101"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSlot(idx)}
                      className="mt-5 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">{t('midterm_date')}</label>
                      <input
                        type="date"
                        value={slot.midterm_date}
                        onChange={(e) => updateSlot(idx, 'midterm_date', e.target.value)}
                        className="input py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">{t('final_date')}</label>
                      <input
                        type="date"
                        value={slot.final_date}
                        onChange={(e) => updateSlot(idx, 'final_date', e.target.value)}
                        className="input py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {editingClass ? t('update') : t('create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
