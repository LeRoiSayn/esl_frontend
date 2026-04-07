import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'

// Layouts
import DashboardLayout from './layouts/DashboardLayout'

// Pages
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import AdminDashboard from './pages/admin/Dashboard'
import AdminFaculties from './pages/admin/Faculties'
import AdminDepartments from './pages/admin/Departments'
import AdminCourses from './pages/admin/Courses'
import AdminClasses from './pages/admin/Classes'
import AdminStudents from './pages/admin/Students'
import AdminTeachers from './pages/admin/Teachers'
import AdminEnrollment from './pages/admin/Enrollment'
import AdminReports from './pages/admin/Reports'
import AdminActivityLog from './pages/admin/ActivityLog'
import AdminGrades from './pages/admin/Grades'
import AdminStudentReport from './pages/admin/StudentReport'
import UnifiedStudentManagement from './pages/admin/UnifiedStudentManagement'
import UnifiedTeacherManagement from './pages/admin/UnifiedTeacherManagement'
import AdminSchedules from './pages/admin/Schedules'

import RegistrarDashboard from './pages/registrar/Dashboard'
import RegistrarStudents from './pages/registrar/Students'
import RegistrarTeachers from './pages/registrar/Teachers'
import RegistrarUsers from './pages/registrar/Users'
import RegistrarReports from './pages/registrar/Reports'

import FinanceDashboard from './pages/finance/Dashboard'
import FinanceFeeTypes from './pages/finance/FeeTypes'
import FinanceStudentFees from './pages/finance/StudentFees'
import FinancePayments from './pages/finance/Payments'
import FinanceReports from './pages/finance/Reports'

import TeacherDashboard from './pages/teacher/Dashboard'
import TeacherClasses from './pages/teacher/Classes'
import TeacherGrades from './pages/teacher/Grades'
import TeacherAttendance from './pages/teacher/Attendance'
import TeacherSchedule from './pages/teacher/Schedule'
import TeacherELearning from './pages/teacher/ELearning'

import StudentDashboard from './pages/student/Dashboard'
import StudentCourses from './pages/student/Courses'
import StudentGrades from './pages/student/Grades'
import StudentAttendance from './pages/student/Attendance'
import StudentSchedule from './pages/student/Schedule'
import StudentFees from './pages/student/Fees'
import StudentELearning from './pages/student/ELearning'

import Profile from './pages/Profile'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-400">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }

  return children
}

function App() {
  const { user } = useAuth()

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a2234',
            color: '#fff',
            borderRadius: '12px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="faculties" element={<AdminFaculties />} />
          <Route path="departments" element={<AdminDepartments />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="classes" element={<AdminClasses />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="enrollment" element={<AdminEnrollment />} />
          <Route path="student-management" element={<UnifiedStudentManagement />} />
          <Route path="student-management/:id/report" element={<AdminStudentReport />} />
          <Route path="teacher-management" element={<UnifiedTeacherManagement />} />
          <Route path="schedules" element={<AdminSchedules />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="activity-log" element={<AdminActivityLog />} />
          <Route path="grades" element={<AdminGrades />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Registrar Routes */}
        <Route
          path="/registrar"
          element={
            <ProtectedRoute allowedRoles={['registrar']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RegistrarDashboard />} />
          <Route path="students" element={<RegistrarStudents />} />
          <Route path="teachers" element={<RegistrarTeachers />} />
          <Route path="users" element={<RegistrarUsers />} />
          <Route path="reports" element={<RegistrarReports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Finance Routes */}
        <Route
          path="/finance"
          element={
            <ProtectedRoute allowedRoles={['finance']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<FinanceDashboard />} />
          <Route path="fee-types" element={<FinanceFeeTypes />} />
          <Route path="student-fees" element={<FinanceStudentFees />} />
          <Route path="payments" element={<FinancePayments />} />
          <Route path="reports" element={<FinanceReports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Teacher Routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="classes" element={<TeacherClasses />} />
          <Route path="grades" element={<TeacherGrades />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="schedule" element={<TeacherSchedule />} />
          <Route path="elearning" element={<TeacherELearning />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="grades" element={<StudentGrades />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="schedule" element={<StudentSchedule />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="elearning" element={<StudentELearning />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
