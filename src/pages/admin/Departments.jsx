import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { departmentApi, facultyApi } from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline'
import { useI18n } from '../../i18n/index.jsx'

export default function AdminDepartments() {
  const { t } = useI18n()
  const [departments, setDepartments] = useState([])
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [formData, setFormData] = useState({
    faculty_id: '',
    name: '',
    code: '',
    description: '',
    head_name: '',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [deptRes, facRes] = await Promise.all([
        departmentApi.getAll(),
        facultyApi.getAll(),
      ])
      setDepartments(deptRes.data.data)
      setFaculties(facRes.data.data)
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingDepartment) {
        await departmentApi.update(editingDepartment.id, formData)
        toast.success(t('department_updated'))
      } else {
        await departmentApi.create(formData)
        toast.success(t('department_created'))
      }
      setModalOpen(false)
      setEditingDepartment(null)
      setFormData({ faculty_id: '', name: '', code: '', description: '', head_name: '' })
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const handleEdit = (dept) => {
    setEditingDepartment(dept)
    setFormData({
      faculty_id: dept.faculty_id,
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      head_name: dept.head_name || '',
    })
    setModalOpen(true)
  }

  const handleDelete = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete ${dept.name}?`)) return
    try {
      await departmentApi.delete(dept.id)
      toast.success(t('department_deleted'))
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const handleToggle = async (dept) => {
    try {
      await departmentApi.toggle(dept.id)
      toast.success(t(dept.is_active ? 'deactivated' : 'activated'))
      fetchData()
    } catch (error) {
      toast.error(t('error'))
    }
  }

  const columns = [
    {
      header: 'Department',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <AcademicCapIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-sm text-gray-500">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Faculty',
      accessor: (row) => row.faculty?.name,
    },
    {
      header: 'Head',
      cell: (row) => row.head_name || '-',
    },
    {
      header: 'Students',
      accessor: 'students_count',
    },
    {
      header: 'Courses',
      accessor: 'courses_count',
    },
    {
      header: 'Status',
      cell: (row) => (
        <button
          onClick={() => handleToggle(row)}
          className={`badge ${row.is_active ? 'badge-success' : 'badge-danger'}`}
        >
          {row.is_active ? t('active') : t('inactive')}
        </button>
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
            Departments
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage academic departments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDepartment(null)
            setFormData({ faculty_id: '', name: '', code: '', description: '', head_name: '' })
            setModalOpen(true)
          }}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Department
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
          data={departments}
          loading={loading}
          searchPlaceholder="Search departments..."
        />
      </motion.div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingDepartment(null)
        }}
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Faculty</label>
            <select
              value={formData.faculty_id}
              onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Select a faculty</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Department Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., Biology"
              required
            />
          </div>
          <div>
            <label className="label">Code</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="input"
              placeholder="e.g., BIO"
              required
              maxLength={10}
            />
          </div>
          <div>
            <label className="label">Head Name</label>
            <input
              type="text"
              value={formData.head_name}
              onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
              className="input"
              placeholder="e.g., Dr. Pascale Mbou"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Brief description of the department"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingDepartment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
