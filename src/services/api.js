import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth / OTP APIs
export const authApi = {
  verifyLoginOtp: (data) => api.post('/verify-login-otp', data),
  resendOtp: (data) => api.post('/resend-otp', data),
  forgotPassword: (data) => api.post('/forgot-password', data),
  resetPassword: (data) => api.post('/reset-password', data),
}

// Dashboard APIs
export const dashboardApi = {
  getAdminStats: () => api.get("/dashboard/admin"),
  getStudentStats: () => api.get("/dashboard/student"),
  getTeacherStats: () => api.get("/dashboard/teacher"),
  getFinanceStats: () => api.get("/dashboard/finance"),
  getRegistrarStats: () => api.get("/dashboard/registrar"),
};

// Faculty APIs
export const facultyApi = {
  getAll: () => api.get("/faculties"),
  getOne: (id) => api.get(`/faculties/${id}`),
  create: (data) => api.post("/faculties", data),
  update: (id, data) => api.put(`/faculties/${id}`, data),
  delete: (id) => api.delete(`/faculties/${id}`),
  toggle: (id) => api.post(`/faculties/${id}/toggle`),
};

// Department APIs
export const departmentApi = {
  getAll: (params) => api.get("/departments", { params }),
  getOne: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post("/departments", data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  toggle: (id) => api.post(`/departments/${id}/toggle`),
};

// Student APIs
export const studentApi = {
  getAll: (params) => api.get("/students", { params }),
  getOne: (id) => api.get(`/students/${id}`),
  create: (data) => api.post("/students", data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  autoEnroll: (id) => api.post(`/students/${id}/auto-enroll`),
  autoEnrollAll: () => api.post("/students/auto-enroll-all"),
  promote: (id) => api.post(`/students/${id}/promote`),
  advanceSemester: (id) => api.post(`/students/${id}/advance-semester`),
  getCourses: (id) => api.get(`/students/${id}/courses`),
  getGrades: (id) => api.get(`/students/${id}/grades`),
  getAttendance: (id) => api.get(`/students/${id}/attendance`),
  getFees: (id) => api.get(`/students/${id}/fees`),
};

// Teacher APIs
export const teacherApi = {
  getAll: (params) => api.get("/teachers", { params }),
  getOne: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post("/teachers", data),
  update: (id, data) => api.put(`/teachers/${id}`, data),
  delete: (id) => api.delete(`/teachers/${id}`),
  getClasses: (id) => api.get(`/teachers/${id}/classes`),
  getStudents: (id) => api.get(`/teachers/${id}/students`),
};

// Course APIs
export const courseApi = {
  getAll: (params) => api.get("/courses", { params }),
  getOne: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post("/courses", data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  toggle: (id) => api.post(`/courses/${id}/toggle`),
};

// Class APIs
export const classApi = {
  getAll: (params) => api.get("/classes", { params }),
  getOne: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post("/classes", data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  getStudents: (id) => api.get(`/classes/${id}/students`),
  assignTeacher: (id, teacherId) =>
    api.post(`/classes/${id}/assign-teacher`, { teacher_id: teacherId }),
};

// Enrollment APIs
export const enrollmentApi = {
  getAll: (params) => api.get("/enrollments", { params }),
  getOne: (id) => api.get(`/enrollments/${id}`),
  create: (data) => api.post("/enrollments", data),
  updateStatus: (id, status) =>
    api.put(`/enrollments/${id}/status`, { status }),
  delete: (id) => api.delete(`/enrollments/${id}`),
};

// Grade APIs
export const gradeApi = {
  getAll: (params) => api.get("/grades", { params }),
  getByClass: (classId) => api.get(`/grades/class/${classId}`),
  create: (data) => api.post("/grades", data),
  update: (id, data) => api.put(`/grades/${id}`, data),
  delete: (id) => api.delete(`/grades/${id}`),
  bulkUpdate: (grades) => api.post("/grades/bulk", { grades }),
  submitToAdmin: (classId) => api.post(`/grades/submit-class/${classId}`),
};

// Attendance APIs
export const attendanceApi = {
  getAll: (params) => api.get("/attendance", { params }),
  getByClass: (classId, date) =>
    api.get(`/attendance/class/${classId}`, { params: { date } }),
  create: (data) => api.post("/attendance", data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
  bulkMark: (classId, date, attendance) =>
    api.post("/attendance/bulk", { class_id: classId, date, attendance }),
  getStatistics: (classId) =>
    api.get(`/attendance/class/${classId}/statistics`),
};

// Fee Type APIs
export const feeTypeApi = {
  getAll: (params) => api.get("/fee-types", { params }),
  getOne: (id) => api.get(`/fee-types/${id}`),
  create: (data) => api.post("/fee-types", data),
  update: (id, data) => api.put(`/fee-types/${id}`, data),
  delete: (id) => api.delete(`/fee-types/${id}`),
  toggle: (id) => api.post(`/fee-types/${id}/toggle`),
};

// Student Fee APIs
export const studentFeeApi = {
  getAll: (params) => api.get("/student-fees", { params }),
  getOne: (id) => api.get(`/student-fees/${id}`),
  create: (data) => api.post("/student-fees", data),
  update: (id, data) => api.put(`/student-fees/${id}`, data),
  delete: (id) => api.delete(`/student-fees/${id}`),
  getByStudent: (studentId) => api.get(`/student-fees/student/${studentId}`),
  assignToAll: (data) => api.post("/student-fees/assign-all", data),
  setInstallmentPlan: (feeId, data) => api.put(`/student-fees/${feeId}/installment-plan`, data),
};

// Payment APIs
export const paymentApi = {
  getAll: (params) => api.get("/payments", { params }),
  getOne: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post("/payments", data),
  update: (id, data) => api.put(`/payments/${id}`, data),
  initialize: (data) => api.post("/payment/initialize", data),
  delete: (id) => api.delete(`/payments/${id}`),
  getReceipt: (id) => api.get(`/payments/${id}/receipt`),
  getTodayCollection: () => api.get("/payments-today"),
};

// Settings APIs
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (data) => api.put("/settings", data),
  reset: () => api.post("/settings/reset"),
  widgets: () => api.get("/settings/widgets"),
};

// Schedule APIs
export const scheduleApi = {
  getAll: (params) => api.get("/schedules", { params }),
  create: (data) => api.post("/schedules", data),
  update: (id, data) => api.put(`/schedules/${id}`, data),
  delete: (id) => api.delete(`/schedules/${id}`),
  getByStudent: (studentId) => api.get(`/schedules/student/${studentId}`),
  getByTeacher: (teacherId) => api.get(`/schedules/teacher/${teacherId}`),
};

// Announcement APIs
export const announcementApi = {
  getAll: (params) => api.get("/announcements", { params }),
  getActive: () => api.get("/announcements-active"),
  create: (data) => api.post("/announcements", data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
};

// Activity Log APIs
export const activityLogApi = {
  getAll: (params) => api.get("/activity-logs", { params }),
  getActions: () => api.get("/activity-logs/actions"),
};

// Chatbot API
export const chatbotApi = {
  send: (message) => api.post("/chatbot", { message }),
  getHistory: () => api.get("/chatbot/history"),
};

// Admin APIs
export const adminApi = {
  searchStudents: (params) => api.get("/admin/students/search", { params }),
  getStudentDetails: (id) => api.get(`/admin/students/${id}/details`),
  getStudentReport: (id) => api.get(`/admin/students/${id}/report`),
  getStudentAcademicSheet: (id) =>
    api.get(`/admin/students/${id}/report/sheet/academic`, { responseType: "blob" }),
  downloadStudentAcademicSheet: (id) =>
    api.get(`/admin/students/${id}/report/download/academic`, { responseType: "blob" }),
  getStudentFinancialSheet: (id) =>
    api.get(`/admin/students/${id}/report/sheet/financial`, { responseType: "blob" }),
  downloadStudentFinancialSheet: (id) =>
    api.get(`/admin/students/${id}/report/download/financial`, { responseType: "blob" }),
  updateGrade: (gradeId, data) => api.put(`/admin/grades/${gradeId}`, data),
  getGradeHistory: (gradeId) => api.get(`/admin/grades/${gradeId}/history`),
  validateClassGrades: (classId) => api.post(`/admin/grades/validate-class/${classId}`),
  rejectClassGrades: (classId, reason) => api.post(`/admin/grades/reject-class/${classId}`, { reason }),
  addStudentCourse: (studentId, data) => api.post(`/admin/students/${studentId}/courses`, data),
  removeStudentCourse: (studentId, courseId) => api.delete(`/admin/students/${studentId}/courses/${courseId}`),
  addTransferGrade: (studentId, data) => api.post(`/admin/students/${studentId}/transfer-grade`, data),
};

// Registrar user management APIs
export const registrarApi = {
  getUsers: (role) => api.get("/registrar/users", { params: { role } }),
  createUser: (formData) => api.post("/registrar/users", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  updateUser: (id, formData) => api.post(`/registrar/users/${id}/profile`, formData, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteUser: (id) => api.delete(`/registrar/users/${id}`),
  resetPassword: (id, password) => api.post(`/registrar/users/${id}/reset-password`, { password }),
};

// Notification API
export const notificationApi = {
  getAll: () => api.get("/notifications"),
};

export default api;
