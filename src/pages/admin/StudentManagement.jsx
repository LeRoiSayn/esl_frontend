import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  UserIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'
import api from '../../services/api'

const StudentManagement = () => {
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    department_id: '',
    level: '',
    status: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [departments, setDepartments] = useState([])
  const [showGradeModal, setShowGradeModal] = useState(null)
  const [showCourseModal, setShowCourseModal] = useState(false)

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments')
      setDepartments(response.data.data || [])
    } catch (_) {
    }
  }

  const searchStudents = async () => {
    if (!searchQuery.trim()) return
    
    setIsLoading(true)
    try {
      const response = await api.get('/admin/students/search', {
        params: {
          search: searchQuery,
          ...filters,
        },
      })
      setStudents(response.data.data || [])
    } catch (_) {
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStudentDetails = async (studentId) => {
    try {
      const response = await api.get(`/admin/students/${studentId}/details`)
      setSelectedStudent(response.data)
    } catch (_) {
    }
  }

  const updateGrade = async (gradeId, newGrade, reason) => {
    try {
      await api.put(`/admin/grades/${gradeId}`, {
        grade: newGrade,
        reason: reason,
      })
      fetchStudentDetails(selectedStudent.student.id)
      setShowGradeModal(null)
    } catch (_) {
    }
  }

  const addCourse = async (courseId) => {
    try {
      await api.post(`/admin/students/${selectedStudent.student.id}/courses`, {
        course_id: courseId,
      })
      fetchStudentDetails(selectedStudent.student.id)
      setShowCourseModal(false)
    } catch (error) {
      alert(error.response?.data?.error || 'Erreur lors de l\'ajout du cours')
    }
  }

  const removeCourse = async (courseId) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce cours?')) return
    
    try {
      await api.delete(`/admin/students/${selectedStudent.student.id}/courses/${courseId}`)
      fetchStudentDetails(selectedStudent.student.id)
    } catch (_) {
    }
  }

  const GradeModificationModal = ({ grade, onClose }) => {
    const [newGrade, setNewGrade] = useState(grade.final_grade)
    const [reason, setReason] = useState('')

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-dark-300 rounded-2xl p-6 w-full max-w-md mx-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Modifier la note
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cours
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {grade.course?.name}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note actuelle
              </label>
              <p className="text-2xl font-bold text-primary-600">{grade.final_grade}/100 ({grade.letter_grade})</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nouvelle note
              </label>
              <input
                type="number"
                value={newGrade}
                onChange={(e) => setNewGrade(parseFloat(e.target.value))}
                min={0}
                max={100}
                step={0.5}
                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white text-xl font-bold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Motif de modification *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez pourquoi cette note est modifiée..."
                className="w-full p-3 rounded-lg bg-gray-100 dark:bg-dark-200 border-0 text-gray-900 dark:text-white"
                rows={3}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Cette modification sera enregistrée dans les logs
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-lg bg-gray-100 dark:bg-dark-200 text-gray-700 dark:text-gray-300 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={() => updateGrade(grade.id, newGrade, reason)}
                disabled={!reason || reason.length < 10}
                className="flex-1 py-3 rounded-lg bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Gestion des Étudiants
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Recherchez et gérez les informations des étudiants
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white dark:bg-dark-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchStudents()}
              placeholder="Rechercher par nom, email ou numéro d'inscription..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-300 border-0 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filters.department_id}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
              className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-300 border-0 text-gray-900 dark:text-white"
            >
              <option value="">Tous les départements</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>

            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-300 border-0 text-gray-900 dark:text-white"
            >
              <option value="">Tous les niveaux</option>
              <option value="L1">Licence 1</option>
              <option value="L2">Licence 2</option>
              <option value="L3">Licence 3</option>
              <option value="M1">Master 1</option>
              <option value="M2">Master 2</option>
            </select>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={searchStudents}
              className="px-6 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              Rechercher
            </motion.button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Résultats ({students.length})
          </h2>
          
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-dark-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-dark-200 rounded-xl">
              <UserIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Entrez un nom ou numéro pour rechercher
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => fetchStudentDetails(student.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    selectedStudent?.student?.id === student.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                      : 'bg-white dark:bg-dark-200 hover:bg-gray-50 dark:hover:bg-dark-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {student.user?.first_name?.[0]}{student.user?.last_name?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {student.user?.first_name} {student.user?.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {student.student_id}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      student.status === 'active' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {student.level}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Student Details */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <motion.div
                key={selectedStudent.student.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Profile Card */}
                <div className="bg-white dark:bg-dark-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                          {selectedStudent.student.user?.first_name?.[0]}{selectedStudent.student.user?.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedStudent.student.user?.first_name} {selectedStudent.student.user?.last_name}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                          {selectedStudent.student.student_id}
                        </p>
                        <p className="text-sm text-gray-400">
                          {selectedStudent.student.department?.name} • {selectedStudent.student.level}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedStudent.student.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {selectedStudent.student.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-dark-300 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <ChartBarIcon className="w-5 h-5 text-primary-500" />
                        <span className="text-sm text-gray-500">Moyenne</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedStudent.statistics.overall_average}/20
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-dark-300 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <ClockIcon className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">Présence</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedStudent.statistics.attendance_rate}%
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-dark-300 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <AcademicCapIcon className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-500">Crédits</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedStudent.statistics.total_credits}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-dark-300 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <CurrencyDollarIcon className="w-5 h-5 text-amber-500" />
                        <span className="text-sm text-gray-500">Solde</span>
                      </div>
                      <p className="text-lg font-bold text-amber-600">
                        {selectedStudent.statistics.financial.remaining.toLocaleString()} F
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grades Section */}
                <div className="bg-white dark:bg-dark-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-primary-500" />
                    Notes
                  </h3>
                  
                  <div className="space-y-3">
                    {selectedStudent.student.grades?.slice(0, 5).map((grade) => (
                      <div
                        key={grade.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-300 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {grade.course?.name}
                          </p>
                          <p className="text-sm text-gray-500">{grade.semester}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-bold ${
                            grade.final_grade >= 50 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {grade.final_grade}/100 ({grade.letter_grade})
                          </span>
                          <button
                            onClick={() => setShowGradeModal(grade)}
                            className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Courses Section */}
                <div className="bg-white dark:bg-dark-200 rounded-xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <AcademicCapIcon className="w-5 h-5 text-primary-500" />
                      Cours inscrits
                    </h3>
                    <button
                      onClick={() => setShowCourseModal(true)}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Ajouter
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedStudent.student.enrollments?.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-300 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {enrollment.course?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {enrollment.course?.code} • {enrollment.course?.credits} crédits
                          </p>
                        </div>
                        <button
                          onClick={() => removeCourse(enrollment.course_id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex items-center justify-center bg-gray-50 dark:bg-dark-200 rounded-xl min-h-[400px]"
              >
                <div className="text-center">
                  <UserIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Sélectionnez un étudiant pour voir ses détails
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Grade Modification Modal */}
      {showGradeModal && (
        <GradeModificationModal
          grade={showGradeModal}
          onClose={() => setShowGradeModal(null)}
        />
      )}
    </div>
  )
}

export default StudentManagement
