import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { teacherApi, departmentApi } from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import { useI18n } from '../../i18n/index.jsx'

const STATUSES = ['active', 'inactive', 'on_leave']

export default function RegistrarTeachers() {
  const { t } = useI18n()
  const [teachers, setTeachers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTeacher, setEditTeacher] = useState(null)
  const [editData, setEditData] = useState({})
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', username: '', password: '', phone: '',
    date_of_birth: '', gender: '', department_id: '', qualification: '', specialization: '',
    hire_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [teachRes, deptRes] = await Promise.all([teacherApi.getAll({ per_page: 100 }), departmentApi.getAll({ active_only: true })])
      setTeachers(teachRes.data.data.data || teachRes.data.data)
      setDepartments(deptRes.data.data)
    } catch (error) { toast.error(t('error')) } finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await teacherApi.create(formData)
      const newId = res.data?.data?.employee_id
      toast.success(newId ? `${t('teacher_created')} — ID: ${newId}` : t('teacher_created'))
      setModalOpen(false)
      setFormData({ first_name: '', last_name: '', email: '', username: '', password: '', phone: '', date_of_birth: '', gender: '', department_id: '', qualification: '', specialization: '', hire_date: new Date().toISOString().split('T')[0] })
      fetchData()
    } catch (error) { toast.error(error.response?.data?.message || 'Creation failed') }
  }

  const openEdit = (teacher) => {
    setEditTeacher(teacher)
    setEditData({
      first_name: teacher.user?.first_name || '',
      last_name: teacher.user?.last_name || '',
      phone: teacher.user?.phone || '',
      date_of_birth: teacher.user?.date_of_birth ? teacher.user.date_of_birth.split('T')[0] : '',
      gender: teacher.user?.gender || '',
      department_id: teacher.department_id || '',
      qualification: teacher.qualification || '',
      specialization: teacher.specialization || '',
      status: teacher.status || 'active',
      new_password: '',
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...editData }
      if (editData.new_password) { payload.password = editData.new_password }
      delete payload.new_password
      await teacherApi.update(editTeacher.id, payload)
      toast.success('Enseignant mis à jour avec succès')
      setEditTeacher(null)
      fetchData()
    } catch (error) { toast.error(error.response?.data?.message || t('error')) }
  }

  const handleDelete = async (teacher) => {
    if (!window.confirm(`Delete ${teacher.user?.first_name}?`)) return
    try { await teacherApi.delete(teacher.id); toast.success(t('item_deleted')); fetchData() }
    catch (error) { toast.error(error.response?.data?.message || 'Delete failed') }
  }

  const columns = [
    { header: 'Enseignant', cell: (row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">{row.user?.first_name?.[0]}{row.user?.last_name?.[0]}</div>
        <div><p className="font-medium">{row.user?.first_name} {row.user?.last_name}</p><p className="text-sm text-gray-500 font-mono">{row.employee_id}</p></div>
      </div>
    ), exportValue: (row) => `${row.user?.first_name ?? ''} ${row.user?.last_name ?? ''}` },
    { header: 'Email', accessor: (row) => row.user?.email },
    { header: 'Département', accessor: (row) => row.department?.name },
    { header: 'Qualification', accessor: 'qualification' },
    { header: 'Statut', cell: (row) => <span className={`badge ${row.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{row.status}</span>, exportValue: (row) => row.status },
    { header: 'Actions', noExport: true, cell: (row) => (
      <div className="flex items-center gap-1">
        <button onClick={() => openEdit(row)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600" title="Modifier">
          <PencilIcon className="w-4 h-4" />
        </button>
        <button onClick={() => handleDelete(row)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600" title="Supprimer">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Enseignants</h1><p className="text-gray-500 dark:text-gray-400">Gérer les enseignants</p></div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><PlusIcon className="w-5 h-5 mr-2" />Ajouter un enseignant</button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <DataTable columns={columns} data={teachers} loading={loading} searchPlaceholder="Rechercher un enseignant..." />
      </motion.div>

      {/* Edit Teacher Modal */}
      {editTeacher && (
        <Modal isOpen={true} onClose={() => setEditTeacher(null)} title={`Modifier — ${editTeacher.user?.first_name} ${editTeacher.user?.last_name}`} size="xl">
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="label">Prénom</label><input type="text" value={editData.first_name} onChange={(e) => setEditData({...editData, first_name: e.target.value})} className="input" required /></div>
              <div><label className="label">Nom</label><input type="text" value={editData.last_name} onChange={(e) => setEditData({...editData, last_name: e.target.value})} className="input" required /></div>
              <div><label className="label">Téléphone</label><input type="tel" value={editData.phone} onChange={(e) => setEditData({...editData, phone: e.target.value})} className="input" /></div>
              <div><label className="label">Date de naissance</label><input type="date" value={editData.date_of_birth} onChange={(e) => setEditData({...editData, date_of_birth: e.target.value})} className="input" /></div>
              <div><label className="label">Genre</label><select value={editData.gender} onChange={(e) => setEditData({...editData, gender: e.target.value})} className="input"><option value="">Sélectionner</option><option value="male">Masculin</option><option value="female">Féminin</option></select></div>
              <div><label className="label">Département</label><select value={editData.department_id} onChange={(e) => setEditData({...editData, department_id: e.target.value})} className="input" required><option value="">Sélectionner</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div><label className="label">Qualification</label><input type="text" value={editData.qualification} onChange={(e) => setEditData({...editData, qualification: e.target.value})} className="input" required /></div>
              <div><label className="label">Spécialisation</label><input type="text" value={editData.specialization} onChange={(e) => setEditData({...editData, specialization: e.target.value})} className="input" /></div>
              <div><label className="label">Statut</label><select value={editData.status} onChange={(e) => setEditData({...editData, status: e.target.value})} className="input">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="label">Nouveau mot de passe <span className="text-gray-400 text-xs">(laisser vide pour ne pas changer)</span></label><input type="password" value={editData.new_password} onChange={(e) => setEditData({...editData, new_password: e.target.value})} className="input" minLength={6} placeholder="Nouveau mot de passe..." /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setEditTeacher(null)} className="btn-secondary">Annuler</button>
              <button type="submit" className="btn-primary">Enregistrer</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Teacher Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter un enseignant" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Prénom</label><input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className="input" required /></div>
            <div><label className="label">Nom</label><input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="input" required /></div>
            <div><label className="label">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input" required /></div>
            <div><label className="label">Nom d'utilisateur</label><input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} className="input" required /></div>
            <div><label className="label">Mot de passe</label><input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input" required minLength={6} /></div>
            <div><label className="label">Téléphone</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="input" /></div>
            <div><label className="label">Département</label><select value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} className="input" required><option value="">Sélectionner</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="label">Qualification</label><input type="text" value={formData.qualification} onChange={(e) => setFormData({...formData, qualification: e.target.value})} className="input" required placeholder="ex: PhD en Biologie" /></div>
            <div><label className="label">Spécialisation</label><input type="text" value={formData.specialization} onChange={(e) => setFormData({...formData, specialization: e.target.value})} className="input" placeholder="ex: Biologie Moléculaire" /></div>
            <div><label className="label">Date d'embauche</label><input type="date" value={formData.hire_date} onChange={(e) => setFormData({...formData, hire_date: e.target.value})} className="input" required /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Annuler</button><button type="submit" className="btn-primary">Créer l'enseignant</button></div>
        </form>
      </Modal>
    </div>
  )
}
