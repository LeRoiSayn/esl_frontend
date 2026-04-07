import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { studentApi, departmentApi } from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { PlusIcon, TrashIcon, ArrowUpCircleIcon, CheckCircleIcon, PencilIcon } from '@heroicons/react/24/outline'
import { useI18n } from '../../i18n/index.jsx'

const LEVELS = ['L1', 'L2', 'L3', 'M1', 'M2', 'D1', 'D2', 'D3']
const STATUSES = ['active', 'inactive', 'graduated', 'suspended']
const UNDERGRADUATE_LEVELS = ['L1', 'L2', 'L3']
const NEXT_LEVEL = { L1: 'L2', L2: 'L3' }

export default function RegistrarStudents() {
  const { t } = useI18n()
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editStudent, setEditStudent] = useState(null)
  const [editData, setEditData] = useState({})
  const [promoteStudent, setPromoteStudent] = useState(null)
  const [promoting, setPromoting] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', username: '', password: '', phone: '',
    date_of_birth: '', gender: '', department_id: '', level: 'L1',
    enrollment_date: new Date().toISOString().split('T')[0], guardian_name: '', guardian_phone: ''
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [studRes, deptRes] = await Promise.all([studentApi.getAll({ per_page: 100 }), departmentApi.getAll({ active_only: true })])
      setStudents(studRes.data.data.data || studRes.data.data)
      setDepartments(deptRes.data.data)
    } catch (error) { toast.error(t('error')) } finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await studentApi.create(formData)
      const newId = res.data?.data?.student_id
      toast.success(newId ? `${t('student_auto_enrolled')} — ID: ${newId}` : t('student_auto_enrolled'))
      setModalOpen(false)
      setFormData({ first_name: '', last_name: '', email: '', username: '', password: '', phone: '', date_of_birth: '', gender: '', department_id: '', level: 'L1', enrollment_date: new Date().toISOString().split('T')[0], guardian_name: '', guardian_phone: '' })
      fetchData()
    } catch (error) { toast.error(error.response?.data?.message || 'Creation failed') }
  }

  const openEdit = (student) => {
    setEditStudent(student)
    setEditData({
      first_name: student.user?.first_name || '',
      last_name: student.user?.last_name || '',
      email: student.user?.email || '',
      username: student.user?.username || '',
      phone: student.user?.phone || '',
      date_of_birth: student.user?.date_of_birth ? student.user.date_of_birth.split('T')[0] : '',
      gender: student.user?.gender || '',
      department_id: student.department_id || '',
      level: student.level || '',
      status: student.status || 'active',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      guardian_email: student.guardian_email || '',
      new_password: '',
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...editData }
      if (editData.new_password) { payload.password = editData.new_password }
      delete payload.new_password
      await studentApi.update(editStudent.id, payload)
      toast.success(t('student_updated'))
      setEditStudent(null)
      fetchData()
    } catch (error) { toast.error(error.response?.data?.message || t('error')) }
  }

  const handleDelete = async (student) => {
    if (!window.confirm(`Delete ${student.user?.first_name}?`)) return
    try { await studentApi.delete(student.id); toast.success(t('item_deleted')); fetchData() }
    catch (error) { toast.error(t('error')) }
  }

  const handlePromote = async () => {
    if (!promoteStudent) return
    setPromoting(true)
    try {
      const res = await studentApi.promote(promoteStudent.id)
      toast.success(res.data?.message || 'Promotion réussie')
      setPromoteStudent(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || t('advance_semester_error'))
    } finally {
      setPromoting(false)
    }
  }

  const columns = [
    { header: t('student'), cell: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white font-medium">{row.user?.first_name?.[0]}{row.user?.last_name?.[0]}</div>
        <div><p className="font-medium">{row.user?.first_name} {row.user?.last_name}</p><p className="text-sm text-gray-500 font-mono">{row.student_id}</p></div>
      </div>
    ), exportValue: (row) => `${row.user?.first_name ?? ''} ${row.user?.last_name ?? ''}` },
    { header: t('email'), accessor: (row) => row.user?.email },
    { header: t('department'), accessor: (row) => row.department?.name },
    { header: t('level'), cell: (row) => <span className="badge badge-info">{row.level}</span>, exportValue: (row) => row.level },
    { header: t('status'), cell: (row) => <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span>, exportValue: (row) => row.status },
    { header: t('actions'), noExport: true, cell: (row) => (
      <div className="flex items-center gap-1">
        <button
          onClick={() => openEdit(row)}
          className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
          title="Modifier"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        {UNDERGRADUATE_LEVELS.includes(row.level) && row.status !== 'graduated' && (
          <button
            onClick={() => setPromoteStudent(row)}
            className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600"
            title={row.level === 'L3' ? t('finalize_bachelor') : `${t('promote_to')} ${NEXT_LEVEL[row.level]}`}
          >
            <ArrowUpCircleIcon className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => handleDelete(row)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600" title="Supprimer">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('menu_students')}</h1><p className="text-gray-500 dark:text-gray-400">{t('students_subtitle')}</p></div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><PlusIcon className="w-5 h-5 mr-2" />{t('add_student')}</button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <DataTable columns={columns} data={students} loading={loading} searchPlaceholder={t('search_students')} />
      </motion.div>

      {/* Edit Student Modal */}
      {editStudent && (
        <Modal isOpen={true} onClose={() => setEditStudent(null)} title={`${t('edit')} — ${editStudent.user?.first_name} ${editStudent.user?.last_name}`} size="xl">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">{t('first_name')}</label><input type="text" value={editData.first_name} onChange={(e) => setEditData({...editData, first_name: e.target.value})} className="input" required /></div>
              <div><label className="label">{t('last_name')}</label><input type="text" value={editData.last_name} onChange={(e) => setEditData({...editData, last_name: e.target.value})} className="input" required /></div>
              <div><label className="label">{t('email')}</label><input type="email" value={editData.email} onChange={(e) => setEditData({...editData, email: e.target.value})} className="input" /></div>
              <div><label className="label">{t('username')}</label><input type="text" value={editData.username} onChange={(e) => setEditData({...editData, username: e.target.value})} className="input" /></div>
              <div><label className="label">{t('phone')}</label><input type="tel" value={editData.phone} onChange={(e) => setEditData({...editData, phone: e.target.value})} className="input" /></div>
              <div><label className="label">{t('date_of_birth')}</label><input type="date" value={editData.date_of_birth} onChange={(e) => setEditData({...editData, date_of_birth: e.target.value})} className="input" /></div>
              <div><label className="label">{t('gender')}</label><select value={editData.gender} onChange={(e) => setEditData({...editData, gender: e.target.value})} className="input"><option value="">{t('select_option')}</option><option value="male">{t('male')}</option><option value="female">{t('female')}</option></select></div>
              <div><label className="label">{t('department')}</label><select value={editData.department_id} onChange={(e) => setEditData({...editData, department_id: e.target.value})} className="input" required><option value="">{t('select_option')}</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="label">{t('level')}</label><select value={editData.level} onChange={(e) => setEditData({...editData, level: e.target.value})} className="input" required>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
              <div><label className="label">{t('status')}</label><select value={editData.status} onChange={(e) => setEditData({...editData, status: e.target.value})} className="input">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="label">{t('guardian_name')}</label><input type="text" value={editData.guardian_name} onChange={(e) => setEditData({...editData, guardian_name: e.target.value})} className="input" /></div>
              <div><label className="label">{t('guardian_phone')}</label><input type="tel" value={editData.guardian_phone} onChange={(e) => setEditData({...editData, guardian_phone: e.target.value})} className="input" /></div>
              <div className="sm:col-span-2"><label className="label">{t('guardian_email')}</label><input type="email" value={editData.guardian_email} onChange={(e) => setEditData({...editData, guardian_email: e.target.value})} className="input" /></div>
              <div className="sm:col-span-2"><label className="label">{t('new_password_hint')}</label><input type="password" value={editData.new_password} onChange={(e) => setEditData({...editData, new_password: e.target.value})} className="input" minLength={6} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setEditStudent(null)} className="btn-secondary">{t('cancel')}</button>
              <button type="submit" className="btn-primary">{t('save_changes')}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Promote Confirmation Modal */}
      {promoteStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-md p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <ArrowUpCircleIcon className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {promoteStudent.level === 'L3' ? t('finalize_bachelor') : t('academic_promotion')}
                </h2>
                <p className="text-sm text-gray-500">
                  {promoteStudent.user?.first_name} {promoteStudent.user?.last_name} — {promoteStudent.student_id}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              {promoteStudent.level === 'L3'
                ? t('finalize_l3_confirm')
                : `${t('promote_to')} ${promoteStudent.level} → ${NEXT_LEVEL[promoteStudent.level]}.`
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
              {t('failed_courses_note')}
            </p>
            <div className="flex gap-3">
              <button onClick={handlePromote} disabled={promoting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                <CheckCircleIcon className="w-4 h-4" />
                {promoting ? t('promoting') : t('confirm')}
              </button>
              <button onClick={() => setPromoteStudent(null)} disabled={promoting} className="px-4 py-2.5 border border-gray-300 dark:border-dark-100 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors">
                {t('cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Student Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('add_student')} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">{t('first_name')}</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="input" required /></div>
            <div><label className="label">{t('last_name')}</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="input" required /></div>
            <div><label className="label">{t('email')}</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input" required /></div>
            <div><label className="label">{t('username_label')}</label><input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="input" required /></div>
            <div><label className="label">{t('password_label')}</label><input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input" required minLength={6} /></div>
            <div><label className="label">{t('phone')}</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input" /></div>
            <div><label className="label">{t('date_of_birth')}</label><input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} className="input" /></div>
            <div><label className="label">{t('gender')}</label><select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="input"><option value="">{t('select_option')}</option><option value="male">{t('male')}</option><option value="female">{t('female')}</option></select></div>
            <div><label className="label">{t('department')}</label><select value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} className="input" required><option value="">{t('select_option')}</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="label">{t('level')}</label><select value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})} className="input" required>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
            <div><label className="label">{t('enrollment_date')}</label><input type="date" value={formData.enrollment_date} onChange={(e) => setFormData({...formData, enrollment_date: e.target.value})} className="input" required /></div>
            <div><label className="label">{t('guardian_name')}</label><input type="text" value={formData.guardian_name} onChange={(e) => setFormData({...formData, guardian_name: e.target.value})} className="input" /></div>
          </div>
          <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
            <p className="text-sm text-primary-700 dark:text-primary-300">ℹ️ {t('student_auto_enrolled_info')}</p>
          </div>
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('cancel')}</button><button type="submit" className="btn-primary">{t('create_student')}</button></div>
        </form>
      </Modal>
    </div>
  )
}
