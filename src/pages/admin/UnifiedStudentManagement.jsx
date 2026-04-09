import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  MagnifyingGlassIcon,
  UserIcon,
  AcademicCapIcon,
  PlusIcon,
  TrashIcon,
  ChartBarIcon,
  ClockIcon,
  XMarkIcon,
  BookOpenIcon,
  ArrowPathIcon,
  FunnelIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import api, {
  studentApi,
  departmentApi,
  adminApi,
  courseApi,
} from "../../services/api";
import { useI18n } from "../../i18n/index.jsx";
import { useLevels } from "../../hooks/useLevels";

export default function UnifiedStudentManagement() {
  const { t } = useI18n();
  const { levelCodes: LEVELS } = useLevels();
  const navigate = useNavigate();
  // State for student list
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    department_id: "",
    level: "",
    status: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Reference data
  const [departments, setDepartments] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);

  // Modal states
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [autoEnrolling, setAutoEnrolling] = useState(false);
  const [advancingSemester, setAdvancingSemester] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    course_id: "",
    final_grade: "",
    source_school: "",
  });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [allCourses, setAllCourses] = useState([]);

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });

  useEffect(() => {
    fetchStudents();
    fetchDepartments();
  }, []);

  const fetchStudents = async (page = 1) => {
    setIsLoadingList(true);
    try {
      const params = {
        per_page: 20,
        page,
        ...filters,
      };
      if (searchQuery) params.search = searchQuery;

      const response = await studentApi.getAll(params);
      const data = response.data.data;

      setStudents(data.data || data);
      if (data.current_page) {
        setPagination({
          current_page: data.current_page,
          last_page: data.last_page,
          total: data.total,
        });
      }
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setIsLoadingList(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.getAll();
      setDepartments(response.data.data?.data || response.data.data || []);
    } catch (_) {
    }
  };

  const fetchStudentProfile = async (studentId) => {
    setIsLoadingProfile(true);
    try {
      const response = await api.get(
        `/student-management/${studentId}/profile`,
      );
      setStudentProfile(response.data.data);
    } catch (error) {
      toast.error(t("error"));
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const fetchAvailableCourses = async (studentId) => {
    try {
      const response = await api.get(
        `/student-management/${studentId}/available-courses`,
      );
      setAvailableCourses(response.data.data.available_courses || []);
    } catch (_) {
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    fetchStudentProfile(student.id);
    fetchAvailableCourses(student.id);
  };

  const openReport = async () => {
    if (!selectedStudent?.id) return;

    try {
      // Default to Academic sheet
      const res = await adminApi.getStudentAcademicSheet(selectedStudent.id);
      const url = window.URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      // Fallback to internal preview page (still printable), if needed
      navigate(`/admin/student-management/${selectedStudent.id}/report`);
    }
  };

  const openFinancialSheet = async () => {
    if (!selectedStudent?.id) return;
    try {
      const res = await adminApi.getStudentFinancialSheet(selectedStudent.id);
      const url = window.URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      navigate(`/admin/student-management/${selectedStudent.id}/report`);
    }
  };

  const handleSearch = () => {
    fetchStudents(1);
  };

  const handleAssignCourse = async (courseId) => {
    if (!selectedStudent) return;

    try {
      await api.post(
        `/student-management/${selectedStudent.id}/assign-course`,
        {
          course_id: courseId,
        },
      );
      toast.success(t("course_assigned"));
      fetchStudentProfile(selectedStudent.id);
      fetchAvailableCourses(selectedStudent.id);
    } catch (error) {
      toast.error(error.response?.data?.message || t("error"));
    }
  };

  const handleRemoveCourse = async (enrollmentId) => {
    if (
      !confirm("Are you sure you want to remove this course from the student?")
    )
      return;

    try {
      await api.delete(
        `/student-management/${selectedStudent.id}/remove-course/${enrollmentId}`,
        {
          data: { reason: "Removed by administrator" },
        },
      );
      toast.success(t("course_removed"));
      fetchStudentProfile(selectedStudent.id);
    } catch (error) {
      toast.error(error.response?.data?.message || t("error"));
    }
  };

  const handleBulkAssignCourses = async () => {
    if (selectedCourses.length === 0) {
      toast.error(t("select_at_least_one_course"));
      return;
    }

    try {
      const response = await api.post(
        `/student-management/${selectedStudent.id}/bulk-assign-courses`,
        {
          course_ids: selectedCourses,
        },
      );
      toast.success(t("courses_assigned"));
      setShowBulkAssignModal(false);
      setSelectedCourses([]);
      fetchStudentProfile(selectedStudent.id);
    } catch (error) {
      toast.error(error.response?.data?.message || t("error"));
    }
  };

  const openAssignModal = () => {
    if (!selectedStudent) return;
    fetchAvailableCourses(selectedStudent.id);
    setShowAssignCourseModal(true);
  };

  const openBulkAssignModal = () => {
    if (!selectedStudent) return;
    fetchAvailableCourses(selectedStudent.id);
    setSelectedCourses([]);
    setShowBulkAssignModal(true);
  };

  const handleAutoEnroll = async () => {
    if (!selectedStudent) return;
    setAutoEnrolling(true);
    try {
      const res = await studentApi.autoEnroll(selectedStudent.id);
      toast.success(res.data.message || t("auto_enrolled_success"));
      fetchStudentProfile(selectedStudent.id);
      fetchAvailableCourses(selectedStudent.id);
    } catch (err) {
      toast.error(
        err.response?.data?.message || t("auto_enrollment_error"),
      );
    } finally {
      setAutoEnrolling(false);
    }
  };

  const handleAdvanceSemester = async () => {
    if (!selectedStudent) return;
    const current = studentProfile?.student?.current_semester || '1';
    if (current === '3') {
      toast.error(t("semester_3_last"));
      return;
    }
    if (!window.confirm(`${t('semester')} ${current} → ${t('semester')} ${parseInt(current) + 1} ?`)) return;
    setAdvancingSemester(true);
    try {
      const res = await studentApi.advanceSemester(selectedStudent.id);
      toast.success(res.data.message || t("semester_advanced_success"));
      fetchStudentProfile(selectedStudent.id);
      fetchAvailableCourses(selectedStudent.id);
    } catch (err) {
      toast.error(err.response?.data?.message || t("advance_semester_error"));
    } finally {
      setAdvancingSemester(false);
    }
  };

  const openTransferModal = async () => {
    setShowTransferModal(true);
    if (allCourses.length === 0) {
      try {
        const res = await courseApi.getAll({ per_page: 200 });
        setAllCourses(res.data.data.data || res.data.data);
      } catch {
        toast.error(t("load_courses_error"));
      }
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    setTransferSubmitting(true);
    try {
      await adminApi.addTransferGrade(selectedStudent.id, transferData);
      toast.success(t("transfer_grade_added"));
      setShowTransferModal(false);
      setTransferData({ course_id: "", final_grade: "", source_school: "" });
      fetchStudentProfile(selectedStudent.id);
    } catch (err) {
      toast.error(err.response?.data?.message || t("transfer_grade_error"));
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Assignment Course Modal Component
  const AssignCourseModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 dark:border-dark-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Assign Course to Student
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedStudent?.user?.first_name}{" "}
              {selectedStudent?.user?.last_name}
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
              placeholder="Search courses..."
              className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
            />
          </div>

          {availableCourses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun cours disponible</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableCourses.map((course) => (
                <div
                  key={course.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                    course.is_retake
                      ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700"
                      : "bg-gray-50 dark:bg-dark-200 hover:bg-gray-100 dark:hover:bg-dark-100"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {course.name}
                      </h4>
                      {course.is_retake && (
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-full">
                          À repasser
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {course.code} • {course.department?.name} •{" "}
                      {course.credits} crédits • Niveau {course.level}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAssignCourse(course.id)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
                  >
                    Assigner
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );

  // Bulk Assign Modal Component
  const BulkAssignModal = () => (
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
              Select multiple courses to assign to{" "}
              {selectedStudent?.user?.first_name}{" "}
              {selectedStudent?.user?.last_name}
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
            {availableCourses.map((course) => (
              <label
                key={course.id}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
                  selectedCourses.includes(course.id)
                    ? "bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500"
                    : course.is_retake
                      ? "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700"
                      : "bg-gray-50 dark:bg-dark-200 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-dark-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedCourses.includes(course.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCourses([...selectedCourses, course.id]);
                    } else {
                      setSelectedCourses(
                        selectedCourses.filter((id) => id !== course.id),
                      );
                    }
                  }}
                  className="w-5 h-5 rounded text-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {course.name}
                    </h4>
                    {course.is_retake && (
                      <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-full">
                        {t("retake_label")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {course.code} • {course.department?.name} • {t("level")}{" "}
                    {course.level}
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Student Management
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage students, view profiles, and customize course assignments
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Student List */}
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
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search students..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-colors ${
                  showFilters
                    ? "bg-primary-500 text-white"
                    : "bg-gray-100 dark:bg-dark-200"
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
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <select
                    value={filters.department_id}
                    onChange={(e) =>
                      setFilters({ ...filters, department_id: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.level}
                    onChange={(e) =>
                      setFilters({ ...filters, level: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
                  >
                    <option value="">All Levels</option>
                    {LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.status}
                    onChange={(e) =>
                      setFilters({ ...filters, status: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-200 border-0"
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="graduated">Graduated</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Student List */}
          <div className="card p-4 max-h-[600px] overflow-y-auto">
            {isLoadingList ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-gray-100 dark:bg-dark-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No students found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => handleSelectStudent(student)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      selectedStudent?.id === student.id
                        ? "bg-primary-50 dark:bg-primary-900/20 border-2 border-primary-500"
                        : "bg-gray-50 dark:bg-dark-200 hover:bg-gray-100 dark:hover:bg-dark-100 border-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white font-medium">
                        {student.user?.first_name?.[0]}
                        {student.user?.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {student.user?.first_name} {student.user?.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {student.student_id} • {student.level}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          student.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {student.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.last_page > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => fetchStudents(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-dark-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-gray-600 dark:text-gray-400">
                {pagination.current_page} / {pagination.last_page}
              </span>
              <button
                onClick={() => fetchStudents(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-dark-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Student Profile */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!selectedStudent ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="card p-8 flex flex-col items-center justify-center min-h-[500px]"
              >
                <UserIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Student
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  Click on a student from the list to view their profile and
                  manage their courses
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
            ) : studentProfile ? (
              <motion.div
                key={studentProfile.student.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Profile Header */}
                <div className="card p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-500 flex items-center justify-center text-white text-2xl font-bold">
                        {studentProfile.student.user?.first_name?.[0]}
                        {studentProfile.student.user?.last_name?.[0]}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {studentProfile.student.user?.first_name}{" "}
                          {studentProfile.student.user?.last_name}
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400">
                          {studentProfile.student.student_id} •{" "}
                          {studentProfile.student.user?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openReport}
                        className="btn-secondary"
                        title="Academic sheet"
                      >
                        <DocumentTextIcon className="w-5 h-5 mr-2" />
                        Academic sheet
                      </button>
                      <button
                        onClick={openFinancialSheet}
                        className="btn-secondary"
                        title="Financial sheet"
                      >
                        <DocumentTextIcon className="w-5 h-5 mr-2" />
                        Financial sheet
                      </button>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          studentProfile.student.status === "active"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {studentProfile.student.status}
                      </span>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <BookOpenIcon className="w-6 h-6 text-blue-500 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {studentProfile.statistics.total_courses}
                      </p>
                      <p className="text-sm text-gray-500">Courses</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <AcademicCapIcon className="w-6 h-6 text-green-500 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {studentProfile.statistics.total_credits}
                      </p>
                      <p className="text-sm text-gray-500">Credits</p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <ChartBarIcon className="w-6 h-6 text-purple-500 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {studentProfile.statistics.grade_average ?? "-"}
                      </p>
                      <p className="text-sm text-gray-500">Average</p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                      <ClockIcon className="w-6 h-6 text-amber-500 mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {studentProfile.statistics.attendance_rate ?? "-"}%
                      </p>
                      <p className="text-sm text-gray-500">Attendance</p>
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div className="card p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Department
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {studentProfile.student.department?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Faculty
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {studentProfile.student.department?.faculty?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Level / Semestre
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {studentProfile.student.level}
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          S{studentProfile.student.current_semester || '1'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Enrollment Date
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(
                          studentProfile.student.enrollment_date,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enrolled Courses - Course Management Section */}
                <div className="card p-6">
                  {/* Retake notice for admin */}
                  {availableCourses.filter((c) => c.is_retake).length > 0 && (
                    <div className="mb-4 p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700">
                      <div className="flex items-center gap-2 mb-2">
                        <ArrowPathIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                          Cours à repasser (
                          {availableCourses.filter((c) => c.is_retake).length})
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableCourses
                          .filter((c) => c.is_retake)
                          .map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium"
                            >
                              <span className="font-mono text-orange-500">
                                {c.code}
                              </span>
                              {c.name}
                              <span className="ml-1 px-1 rounded bg-orange-200 dark:bg-orange-800 text-orange-600 dark:text-orange-400 text-xs">
                                {c.level}
                              </span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpenIcon className="w-5 h-5 text-primary-500" />
                      Cours inscrits
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={openTransferModal}
                        className="px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                        title={t("add_transfer_grade_title")}
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                        {t("transfer_label")}
                      </button>
                      <button
                        onClick={handleAutoEnroll}
                        disabled={autoEnrolling}
                        className="px-3 py-2 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                        title={`${t('enrollment')} S${studentProfile?.student?.current_semester || '1'} - ${studentProfile?.student?.level}`}
                      >
                        {autoEnrolling ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <BookOpenIcon className="w-4 h-4" />
                        )}
                        {t('auto_enroll')} (S{studentProfile?.student?.current_semester || '1'})
                      </button>
                      {(studentProfile?.student?.current_semester || '1') !== '3' && (
                        <button
                          onClick={handleAdvanceSemester}
                          disabled={advancingSemester}
                          className="px-3 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
                          title={`${t('semester')} ${parseInt(studentProfile?.student?.current_semester || '1') + 1}`}
                        >
                          {advancingSemester ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowPathIcon className="w-4 h-4" />
                          )}
                          S{studentProfile?.student?.current_semester || '1'} → S{parseInt(studentProfile?.student?.current_semester || '1') + 1}
                        </button>
                      )}
                      <button
                        onClick={openBulkAssignModal}
                        className="px-3 py-2 bg-gray-100 dark:bg-dark-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-dark-100 transition-colors flex items-center gap-1"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                        {t('auto_enroll_all')}
                      </button>
                      <button
                        onClick={openAssignModal}
                        className="px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors flex items-center gap-1"
                      >
                        <PlusIcon className="w-4 h-4" />
                        {t('add_course')}
                      </button>
                    </div>
                  </div>

                  {studentProfile.student.enrollments?.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpenIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No courses enrolled</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentProfile.student.enrollments
                        ?.filter((e) => e.status === "enrolled")
                        .map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-200 rounded-xl"
                          >
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {enrollment.class?.course?.name}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {enrollment.class?.course?.code} •{" "}
                                {enrollment.class?.course?.credits} credits •
                                Level {enrollment.class?.course?.level}
                                {enrollment.class?.teacher?.user && (
                                  <>
                                    {" "}
                                    • Prof.{" "}
                                    {
                                      enrollment.class.teacher.user.first_name
                                    }{" "}
                                    {enrollment.class.teacher.user.last_name}
                                  </>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                                {enrollment.status}
                              </span>
                              <button
                                onClick={() =>
                                  handleRemoveCourse(enrollment.id)
                                }
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Remove course"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Transfer Student Note */}
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      <strong>Note for Transfer Students:</strong> You can add
                      or remove courses to customize this student's academic
                      path. Removed courses are marked as "dropped" and can be
                      tracked in the enrollment history.
                    </p>
                  </div>
                </div>

                {/* Grades */}
                {studentProfile.grades?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <ChartBarIcon className="w-5 h-5 text-primary-500" />
                      Grades
                    </h3>
                    <div className="space-y-2">
                      {studentProfile.grades.map((grade) => (
                        <div
                          key={grade.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-200 rounded-lg"
                        >
                          <span className="text-gray-900 dark:text-white text-sm">
                            {grade.enrollment?.class?.course?.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {grade.letter_grade && (
                              <span
                                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                  grade.final_grade >= 80
                                    ? "bg-green-100 text-green-700"
                                    : grade.final_grade >= 65
                                      ? "bg-blue-100 text-blue-700"
                                      : grade.final_grade >= 50
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-700"
                                }`}
                              >
                                {grade.letter_grade}
                              </span>
                            )}
                            <span
                              className={`font-bold text-sm ${
                                grade.final_grade >= 50
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {grade.final_grade ?? "—"}/100
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAssignCourseModal && <AssignCourseModal />}
        {showBulkAssignModal && <BulkAssignModal />}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-dark-300 rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {t("add_transfer_grade_title")}
                </h3>
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-100"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {t("transfer_grade_info")}
              </p>
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="label">{t("course")}</label>
                  <select
                    value={transferData.course_id}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        course_id: e.target.value,
                      })
                    }
                    className="input"
                    required
                  >
                    <option value="">{t("select_course")}</option>
                    {allCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.level} — {c.code} · {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{t("final_grade_label")}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={transferData.final_grade}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        final_grade: e.target.value,
                      })
                    }
                    className="input"
                    placeholder="ex. 72.5"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    {t("source_school")}
                  </label>
                  <input
                    type="text"
                    value={transferData.source_school}
                    onChange={(e) =>
                      setTransferData({
                        ...transferData,
                        source_school: e.target.value,
                      })
                    }
                    className="input"
                    placeholder="ex. Université de Libreville"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="btn-secondary"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={transferSubmitting}
                    className="btn-primary disabled:opacity-50"
                  >
                    {transferSubmitting ? t("saving") : t("save")}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
