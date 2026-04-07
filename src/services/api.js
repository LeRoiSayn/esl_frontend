import axios from "axios";

// Dev: Vite proxy handles /api → backend (no VITE_API_URL needed).
// Prod: set VITE_API_URL=https://your-backend.com  (no trailing slash, no /api suffix).
const apiRoot = (import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");
const api = axios.create({
  baseURL: apiRoot ? `${apiRoot}/api` : "/api",
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

// ── In-memory cache: dashboard stats (2 min TTL) ────────────────────────────
const _cache = {};
const CACHE_TTL = 2 * 60 * 1000;

function withCache(key, fetcher) {
  const now = Date.now();
  const hit = _cache[key];
  if (hit && now - hit.ts < CACHE_TTL) return Promise.resolve(hit.res);
  return fetcher().then((res) => {
    _cache[key] = { res, ts: now };
    return res;
  });
}

export function invalidateDashboardCache() {
  Object.keys(_cache).forEach((k) => delete _cache[k]);
}

// ── In-memory cache: list pages (30 s TTL) ───────────────────────────────────
// Prevents re-fetching on every sidebar navigation while keeping data fresh.
// Mutations auto-invalidate via the prefix helpers below.
const _lc = {};
const LIST_TTL = 30 * 1000;

function withListCache(key, fetcher) {
  const now = Date.now();
  const hit = _lc[key];
  if (hit && now - hit.ts < LIST_TTL) return Promise.resolve(hit.res);
  return fetcher().then((res) => {
    _lc[key] = { res, ts: now };
    return res;
  });
}

// Invalidate all cache entries whose key starts with `prefix`
function bustList(prefix) {
  Object.keys(_lc).forEach((k) => { if (k.startsWith(prefix)) delete _lc[k]; });
}

// Serialize params to a stable string key (handles undefined gracefully)
function pk(params) {
  return params && Object.keys(params).length ? JSON.stringify(params) : '';
}

// Dashboard APIs
export const dashboardApi = {
  getAdminStats:     () => withCache("admin",     () => api.get("/dashboard/admin")),
  getStudentStats:   () => withCache("student",   () => api.get("/dashboard/student")),
  getTeacherStats:   () => withCache("teacher",   () => api.get("/dashboard/teacher")),
  getFinanceStats:   () => withCache("finance",   () => api.get("/dashboard/finance")),
  getRegistrarStats: () => withCache("registrar", () => api.get("/dashboard/registrar")),
};

// Faculty APIs
export const facultyApi = {
  getAll: (p) => withListCache(`fac:${pk(p)}`, () => api.get("/faculties", { params: p })),
  getOne: (id) => api.get(`/faculties/${id}`),
  create: (data) => api.post("/faculties", data).then(r => (bustList('fac:'), r)),
  update: (id, data) => api.put(`/faculties/${id}`, data).then(r => (bustList('fac:'), r)),
  delete: (id) => api.delete(`/faculties/${id}`).then(r => (bustList('fac:'), r)),
  toggle: (id) => api.post(`/faculties/${id}/toggle`).then(r => (bustList('fac:'), r)),
};

// Department APIs
export const departmentApi = {
  getAll: (p) => withListCache(`dept:${pk(p)}`, () => api.get("/departments", { params: p })),
  getOne: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post("/departments", data).then(r => (bustList('dept:'), r)),
  update: (id, data) => api.put(`/departments/${id}`, data).then(r => (bustList('dept:'), r)),
  delete: (id) => api.delete(`/departments/${id}`).then(r => (bustList('dept:'), r)),
  toggle: (id) => api.post(`/departments/${id}/toggle`).then(r => (bustList('dept:'), r)),
};

// Student APIs
export const studentApi = {
  getAll: (p) => withListCache(`stu:${pk(p)}`, () => api.get("/students", { params: p })),
  getOne: (id) => api.get(`/students/${id}`),
  create: (data) => api.post("/students", data).then(r => (bustList('stu:'), r)),
  update: (id, data) => api.put(`/students/${id}`, data).then(r => (bustList('stu:'), r)),
  delete: (id) => api.delete(`/students/${id}`).then(r => (bustList('stu:'), r)),
  autoEnroll: (id) => api.post(`/students/${id}/auto-enroll`).then(r => (bustList('stu:'), r)),
  autoEnrollAll: () => api.post("/students/auto-enroll-all").then(r => (bustList('stu:'), r)),
  promote: (id) => api.post(`/students/${id}/promote`).then(r => (bustList('stu:'), r)),
  advanceSemester: (id) => api.post(`/students/${id}/advance-semester`).then(r => (bustList('stu:'), r)),
  getCourses: (id) => withListCache(`stu-courses:${id}`, () => api.get(`/students/${id}/courses`)),
  getGrades: (id) => withListCache(`stu-grades:${id}`, () => api.get(`/students/${id}/grades`)),
  getAttendance: (id) => withListCache(`stu-att:${id}`, () => api.get(`/students/${id}/attendance`)),
  getFees: (id) => withListCache(`stu-fees:${id}`, () => api.get(`/students/${id}/fees`)),
};

// Teacher APIs
export const teacherApi = {
  getAll: (p) => withListCache(`tch:${pk(p)}`, () => api.get("/teachers", { params: p })),
  getOne: (id) => api.get(`/teachers/${id}`),
  create: (data) => api.post("/teachers", data).then(r => (bustList('tch:'), r)),
  update: (id, data) => api.put(`/teachers/${id}`, data).then(r => (bustList('tch:'), r)),
  delete: (id) => api.delete(`/teachers/${id}`).then(r => (bustList('tch:'), r)),
  getClasses: (id) => withListCache(`tch-cls:${id}`, () => api.get(`/teachers/${id}/classes`)),
  getStudents: (id) => api.get(`/teachers/${id}/students`),
};

// Course APIs
export const courseApi = {
  getAll: (p) => withListCache(`crs:${pk(p)}`, () => api.get("/courses", { params: p })),
  getOne: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post("/courses", data).then(r => (bustList('crs:'), r)),
  update: (id, data) => api.put(`/courses/${id}`, data).then(r => (bustList('crs:'), r)),
  delete: (id) => api.delete(`/courses/${id}`).then(r => (bustList('crs:'), r)),
  toggle: (id) => api.post(`/courses/${id}/toggle`).then(r => (bustList('crs:'), r)),
};

// Class APIs
export const classApi = {
  getAll: (p) => withListCache(`cls:${pk(p)}`, () => api.get("/classes", { params: p })),
  getOne: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post("/classes", data).then(r => (bustList('cls:'), r)),
  update: (id, data) => api.put(`/classes/${id}`, data).then(r => (bustList('cls:'), r)),
  delete: (id) => api.delete(`/classes/${id}`).then(r => (bustList('cls:'), r)),
  getStudents: (id) => api.get(`/classes/${id}/students`),
  assignTeacher: (id, teacherId) =>
    api.post(`/classes/${id}/assign-teacher`, { teacher_id: teacherId }).then(r => (bustList('cls:'), r)),
};

// Enrollment APIs
export const enrollmentApi = {
  getAll: (p) => withListCache(`enr:${pk(p)}`, () => api.get("/enrollments", { params: p })),
  getOne: (id) => api.get(`/enrollments/${id}`),
  create: (data) => api.post("/enrollments", data).then(r => (bustList('enr:'), r)),
  updateStatus: (id, status) =>
    api.put(`/enrollments/${id}/status`, { status }).then(r => (bustList('enr:'), r)),
  delete: (id) => api.delete(`/enrollments/${id}`).then(r => (bustList('enr:'), r)),
};

// Grade APIs
export const gradeApi = {
  getAll: (p) => withListCache(`grd:${pk(p)}`, () => api.get("/grades", { params: p })),
  getByClass: (classId) => withListCache(`grd-cls:${classId}`, () => api.get(`/grades/class/${classId}`)),
  create: (data) => api.post("/grades", data).then(r => (bustList('grd:'), r)),
  update: (id, data) => api.put(`/grades/${id}`, data).then(r => (bustList('grd:'), r)),
  delete: (id) => api.delete(`/grades/${id}`).then(r => (bustList('grd:'), r)),
  bulkUpdate: (grades) => api.post("/grades/bulk", { grades }).then(r => (bustList('grd:'), bustList('stu-grades:'), r)),
  submitToAdmin: (classId) => api.post(`/grades/submit-class/${classId}`).then(r => (bustList('grd:'), r)),
};

// Attendance APIs
export const attendanceApi = {
  getAll: (p) => withListCache(`att:${pk(p)}`, () => api.get("/attendance", { params: p })),
  getByClass: (classId, date) =>
    api.get(`/attendance/class/${classId}`, { params: { date } }),
  create: (data) => api.post("/attendance", data).then(r => (bustList('att:'), bustList('stu-att:'), r)),
  update: (id, data) => api.put(`/attendance/${id}`, data).then(r => (bustList('att:'), bustList('stu-att:'), r)),
  delete: (id) => api.delete(`/attendance/${id}`).then(r => (bustList('att:'), bustList('stu-att:'), r)),
  bulkMark: (classId, date, attendance) =>
    api.post("/attendance/bulk", { class_id: classId, date, attendance }).then(r => (bustList('att:'), bustList('stu-att:'), r)),
  getStatistics: (classId) =>
    api.get(`/attendance/class/${classId}/statistics`),
};

// Fee Type APIs
export const feeTypeApi = {
  getAll: (p) => withListCache(`ft:${pk(p)}`, () => api.get("/fee-types", { params: p })),
  getOne: (id) => api.get(`/fee-types/${id}`),
  create: (data) => api.post("/fee-types", data).then(r => (bustList('ft:'), r)),
  update: (id, data) => api.put(`/fee-types/${id}`, data).then(r => (bustList('ft:'), r)),
  delete: (id) => api.delete(`/fee-types/${id}`).then(r => (bustList('ft:'), r)),
  toggle: (id) => api.post(`/fee-types/${id}/toggle`).then(r => (bustList('ft:'), r)),
};

// Student Fee APIs
export const studentFeeApi = {
  getAll: (p) => withListCache(`sf:${pk(p)}`, () => api.get("/student-fees", { params: p })),
  getOne: (id) => api.get(`/student-fees/${id}`),
  create: (data) => api.post("/student-fees", data).then(r => (bustList('sf:'), bustList('stu-fees:'), r)),
  update: (id, data) => api.put(`/student-fees/${id}`, data).then(r => (bustList('sf:'), bustList('stu-fees:'), r)),
  delete: (id) => api.delete(`/student-fees/${id}`).then(r => (bustList('sf:'), bustList('stu-fees:'), r)),
  getByStudent: (studentId) => api.get(`/student-fees/student/${studentId}`),
  assignToAll: (data) => api.post("/student-fees/assign-all", data).then(r => (bustList('sf:'), bustList('stu-fees:'), r)),
  setInstallmentPlan: (feeId, data) => api.put(`/student-fees/${feeId}/installment-plan`, data).then(r => (bustList('sf:'), bustList('stu-fees:'), r)),
};

// Payment APIs
export const paymentApi = {
  getAll: (p) => withListCache(`pay:${pk(p)}`, () => api.get("/payments", { params: p })),
  getOne: (id) => api.get(`/payments/${id}`),
  create: (data) => api.post("/payments", data).then(r => (bustList('pay:'), invalidateDashboardCache(), r)),
  update: (id, data) => api.put(`/payments/${id}`, data).then(r => (bustList('pay:'), r)),
  initialize: (data) => api.post("/payment/initialize", data),
  delete: (id) => api.delete(`/payments/${id}`).then(r => (bustList('pay:'), r)),
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
  getAll: (p) => withListCache(`sched:${pk(p)}`, () => api.get("/schedules", { params: p })),
  create: (data) => api.post("/schedules", data).then(r => (bustList('sched:'), r)),
  update: (id, data) => api.put(`/schedules/${id}`, data).then(r => (bustList('sched:'), r)),
  delete: (id) => api.delete(`/schedules/${id}`).then(r => (bustList('sched:'), r)),
  getByStudent: (studentId) => withListCache(`sched-stu:${studentId}`, () => api.get(`/schedules/student/${studentId}`)),
  getByTeacher: (teacherId) => withListCache(`sched-tch:${teacherId}`, () => api.get(`/schedules/teacher/${teacherId}`)),
};

// Announcement APIs
export const announcementApi = {
  getAll: (p) => withListCache(`ann:${pk(p)}`, () => api.get("/announcements", { params: p })),
  getActive: () => withListCache('ann:active', () => api.get("/announcements-active")),
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
