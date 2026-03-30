import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { facultyApi } from '../../services/api'
import DataTable from '../../components/DataTable'
import Modal from '../../components/Modal'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingLibraryIcon,
} from '@heroicons/react/24/outline'
import { useI18n } from '../../i18n/index.jsx'

export default function AdminFaculties() {
  const { t } = useI18n()
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    dean_name: '',
  })

  useEffect(() => {
    fetchFaculties()
  }, [])

  const fetchFaculties = async () => {
    try {
      const response = await facultyApi.getAll()
      setFaculties(response.data.data)
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingFaculty) {
        await facultyApi.update(editingFaculty.id, formData)
        toast.success(t('faculty_updated'))
      } else {
        await facultyApi.create(formData)
        toast.success(t('faculty_created'))
      }
      setModalOpen(false)
      setEditingFaculty(null)
      setFormData({ name: '', code: '', description: '', dean_name: '' })
      fetchFaculties()
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const handleEdit = (faculty) => {
    setEditingFaculty(faculty)
    setFormData({
      name: faculty.name,
      code: faculty.code,
      description: faculty.description || '',
      dean_name: faculty.dean_name || '',
    })
    setModalOpen(true)
  }

  const handleDelete = async (faculty) => {
    if (!window.confirm(`Are you sure you want to delete ${faculty.name}?`)) return
    try {
      await facultyApi.delete(faculty.id)
      toast.success(t('faculty_deleted'))
      fetchFaculties()
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const handleToggle = async (faculty) => {
    try {
      await facultyApi.toggle(faculty.id)
      toast.success(t(faculty.is_active ? 'deactivated' : 'activated'))
      fetchFaculties()
    } catch (error) {
      toast.error(t('error'))
    }
  }

  const columns = [
    {
      header: 'Faculty',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <BuildingLibraryIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-sm text-gray-500">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Dean',
      accessor: 'dean_name',
      cell: (row) => row.dean_name || '-',
    },
    {
      header: 'Departments',
      accessor: 'departments_count',
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
            Faculties
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage university faculties
          </p>
        </div>
        <button
          onClick={() => {
            setEditingFaculty(null)
            setFormData({ name: '', code: '', description: '', dean_name: '' })
            setModalOpen(true)
          }}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Faculty
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
          data={faculties}
          loading={loading}
          searchPlaceholder="Search faculties..."
        />
      </motion.div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingFaculty(null)
        }}
        title={editingFaculty ? 'Edit Faculty' : 'Add Faculty'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Faculty Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., Faculty of Sciences"
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
              placeholder="e.g., FSCI"
              required
              maxLength={10}
            />
          </div>
          <div>
            <label className="label">Dean Name</label>
            <input
              type="text"
              value={formData.dean_name}
              onChange={(e) => setFormData({ ...formData, dean_name: e.target.value })}
              className="input"
              placeholder="e.g., Prof. Emmanuel Ndong"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Brief description of the faculty"
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
              {editingFaculty ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
