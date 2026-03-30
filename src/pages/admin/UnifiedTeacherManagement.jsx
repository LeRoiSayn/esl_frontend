import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  MagnifyingGlassIcon,
  UserIcon,
  AcademicCapIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  BookOpenIcon,
  ArrowPathIcon,
  FunnelIcon,
  UsersIcon,
  ClockIcon,
  CalendarIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import api, { teacherApi, departmentApi, courseApi } from '../../services/api'
import { useI18n } from '../../i18n/index.jsx'

export default function UnifiedTeacherManagement() {
  const { t } = useI18n()
  // State for teacher list
  const [teachers, setTeachers] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [teacherProfile, setTeacherProfile] = useState(null)
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    department_id: '',
    status: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Reference data
  const [departments, setDepartments] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])

  // Modal states
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false)
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const [selectedCourses, setSelectedCourses] = useState([])

  // Pagination
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })

  useEffect(() => {
    fetchTeachers()
    fetchDepartments()
  }, [])

  const fetchTeachers = async (page = 1) => {
    setIsLoadingList(true)
    try {
      const params = {
        per_page: 20,
        page,
        ...filters,
      }
      if (searchQuery) params.search = searchQuery

      const response = await teacherApi.getAll(params)
      const data = response.data.data
      
      setTeachers(data.data || data)
      if (data.current_page) {
        setPagination({
          current_page: data.current_page,
          last_page: data.last_page,
          total: data.total,
        })
      }
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setIsLoadingList(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll()
      setDepartments(response.data.data?.data || response.data.data || [])
    } catch (_) {
    }
  }

  const fetchTeacherProfile = async (teacherId) => {
    setIsLoadingProfile(true)
    try {
      const response = await api.get(`/teacher-management/${teacherId}/profile`)
      setTeacherProfile(response.data.data)
    } catch (error) {
      toast.error(t('error'))
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const fetchAvailableCourses = async (teacherId) => {
    try {
      const response = await api.get(`/teacher-management/${teacherId}/available-courses`)
      setAvailableCourses(response.data.data.courses || [])
    } catch (error) {
      toast.error(t('error'))
    }
  }

  const handleSelectTeacher = (teacher) => {
    setSelectedTeacher(teacher)
    fetchTeacherProfile(teacher.id)
  }

  const handleSearch = () => {
    fetchTeachers(1)
  }

  const handleAssignCourse = async (courseId) => {
    if (!selectedTeacher) return

    try {
      await api.post(`/teacher-management/${selectedTeacher.id}/assign-course`, {
        course_id: courseId,
      })
      toast.success(t('course_assigned'))
      fetchTeacherProfile(selectedTeacher.id)
      fetchAvailableCourses(selectedTeacher.id)
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const handleRemoveCourse = async (classId) => {
    if (!confirm('Are you sure you want to remove this course assignment?')) return

    try {
      await api.delete(`/teacher-management/${selectedTeacher.id}/remove-course/${classId}`, {
        data: { unassign_only: true }
      })
      toast.success(t('course_removed'))
      fetchTeacherProfile(selectedTeacher.id)
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const handleBulkAssignCourses = async () => {
    if (selectedCourses.length === 0) {
      toast.error(t('select_at_least_one_course'))
      return
    }

    try {
      const response = await api.post(`/teacher-management/${selectedTeacher.id}/bulk-assign-courses`, {
        course_ids: selectedCourses,
      })
      toast.success(t('courses_assigned'))
      setShowBulkAssignModal(false)
      setSelectedCourses([])
      fetchTeacherProfile(selectedTeacher.id)
    } catch (error) {
      toast.error(error.response?.data?.message || t('error'))
    }
  }

  const openAssignModal = () => {
    if (!selectedTeacher) return
    fetchAvailableCourses(selectedTeacher.id)
    setShowAssignCourseModal(true)
  }

  const openBulkAssignModal = () => {
    if (!selectedTeacher) return
    fetchAvailableCourses(selectedTeacher.id)
    setSelectedCourses([])
    setShowBulkAssignModal(true)
  }

  // Assign Course Modal Component
  const AssignCourseModal = () => {
    const [courseFilter, setCourseFilter] = useState('')
    
    const filteredCourses = availableCourses.filter(course => 
      !course.is_assigned && 
      (course.name.toLowerCase().includes(courseFilter.toLowerCase()) ||
       course.code?.toLowerCase().includes(courseFilter.toLowerCase()))
    )

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 dark:border-dark-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Assign Course to Teacher
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Prof. {selectedTeacher?.user?.first_name} {selectedTeacher?.user?.last_name}
              </p>
            </div>
            <button
              onClick={() => setShowAssignCourseModal(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="mb-4">
              <input
                type="text"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                placeholder="Search courses..."
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
              />
            </div>

            <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Important:</strong> Only administrators can assign courses to teachers.
                Teachers cannot self-assign courses.
              </p>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No available courses found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-200 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {course.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {course.code} • {course.department?.name} • {course.credits} credits • Level {course.level}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssignCourse(course.id)}
                      className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // Bulk Assign Modal Component
  const BulkAssignModal = () => {
    const unassignedCourses = availableCourses.filter(course => !course.is_assigned)

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 dark:border-dark-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Bulk Assign Courses
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Select courses to assign to Prof. {selectedTeacher?.user?.first_name} {selectedTeacher?.user?.last_name}
              </p>
            </div>
            <button
              onClick={() => setShowBulkAssignModal(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[50vh]">
            <div className="space-y-2">
              {unassignedCourses.map((course) => (
                <label
                  key={course.id}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                    selectedCourses.includes(course.id)
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                      : 'bg-gray-50 dark:bg-dark-200 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-dark-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCourses.includes(course.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCourses([...selectedCourses, course.id])
                      } else {
                        setSelectedCourses(selectedCourses.filter(id => id !== course.id))
                      }
                    }}
                    className="w-5 h-5 rounded text-primary-500"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {course.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {course.code} • {course.department?.name} • Level {course.level}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-dark-100 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {selectedCourses.length} course(s) selected
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-dark-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignCourses}
                disabled={selectedCourses.length === 0}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                Assign {selectedCourses.length} Course(s)
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Teacher Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage teachers, view profiles, and assign courses (Admin controlled)
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Teacher List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search & Filters */}
          <div className="card p-4 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search teachers..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-dark-200'
                }`}
              >
                <FunnelIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600"
              >
                Search
              </button>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <select
                    value={filters.department_id}
                    onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Teacher List */}
          <div className="card p-4 max-h-[600px] overflow-y-auto">
            {isLoadingList ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-dark-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No teachers found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teachers.map((teacher) => (
                  <motion.div
                    key={teacher.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleSelectTeacher(teacher)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedTeacher?.id === teacher.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500'
                        : 'bg-gray-50 dark:bg-dark-200 hover:bg-gray-100 dark:hover:bg-dark-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                        {teacher.user?.first_name?.[0]}{teacher.user?.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          Prof. {teacher.user?.first_name} {teacher.user?.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {teacher.employee_id} • {teacher.department?.name}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        teacher.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {teacher.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Teacher Profile */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!selectedTeacher ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card p-8 flex flex-col items-center justify-center min-h-[500px]"
              >
                <UserIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Teacher
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Click on a teacher from the list to view their profile and manage course assignments
                </p>
              </motion.div>
            ) : isLoadingProfile ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-8 min-h-[500px] flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500">Loading profile...</p>
                </div>
              </motion.div>
            ) : teacherProfile ? (
              <motion.div
                key={teacherProfile.teacher.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Profile Header */}
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                        {teacherProfile.teacher.user?.first_name?.[0]}{teacherProfile.teacher.user?.last_name?.[0]}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          Prof. {teacherProfile.teacher.user?.first_name} {teacherProfile.teacher.user?.last_name}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                          {teacherProfile.teacher.employee_id} • {teacherProfile.teacher.user?.email}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      teacherProfile.teacher.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {teacherProfile.teacher.status}
                    </span>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <BookOpenIcon className="w-6 h-6 text-blue-500 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {teacherProfile.statistics.total_classes}
                      </p>
                      <p className="text-sm text-gray-500">Active Classes</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <UsersIcon className="w-6 h-6 text-green-500 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {teacherProfile.statistics.total_students}
                      </p>
                      <p className="text-sm text-gray-500">Total Students</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <AcademicCapIcon className="w-6 h-6 text-purple-500 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {teacherProfile.statistics.total_courses}
                      </p>
                      <p className="text-sm text-gray-500">Courses</p>
                    </div>
                  </div>
                </div>

                {/* Teacher Information */}
                <div className="card p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {teacherProfile.teacher.department?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Faculty</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {teacherProfile.teacher.department?.faculty?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Qualification</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {teacherProfile.teacher.qualification}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Specialization</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {teacherProfile.teacher.specialization || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Hire Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(teacherProfile.teacher.hire_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Courses - Course Assignment Section */}
                <div className="card p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpenIcon className="w-5 h-5 text-primary-500" />
                      Assigned Courses
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={openBulkAssignModal}
                        className="px-3 py-2 bg-gray-100 dark:bg-dark-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors flex items-center gap-1"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                        Bulk Assign
                      </button>
                      <button
                        onClick={openAssignModal}
                        className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors flex items-center gap-1"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Assign Course
                      </button>
                    </div>
                  </div>

                  {/* Important Notice */}
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      <strong>Admin Control:</strong> Only administrators can assign or remove 
                      courses from teachers. Teachers cannot self-assign courses.
                    </p>
                  </div>

                  {teacherProfile.teacher.classes?.filter(c => c.is_active).length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpenIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No courses assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teacherProfile.teacher.classes?.filter(c => c.is_active).map((cls) => (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-200 rounded-xl"
                        >
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {cls.course?.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {cls.course?.code} • {cls.academic_year} • Semester {cls.semester} • 
                              Section {cls.section} • {cls.enrollments?.filter(e => e.status === 'enrolled').length || 0} students
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full flex items-center gap-1">
                              <CheckCircleIcon className="w-3 h-3" />
                              Active
                            </span>
                            <button
                              onClick={() => handleRemoveCourse(cls.id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove course assignment"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAssignCourseModal && <AssignCourseModal />}
        {showBulkAssignModal && <BulkAssignModal />}
      </AnimatePresence>
    </div>
  )
}
