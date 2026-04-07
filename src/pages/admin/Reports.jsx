import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bar, Pie } from 'react-chartjs-2'
import {
  UserGroupIcon, UsersIcon, BookOpenIcon,
  ChartBarIcon, CalendarIcon, PrinterIcon,
} from '@heroicons/react/24/outline'
import { dashboardApi, classApi, teacherApi, courseApi, departmentApi } from '../../services/api'
import StatCard from '../../components/StatCard'
import { useI18n } from '../../i18n/index.jsx'
import { esc, openReport } from '../../utils/reportPrint'

function generateColors(count) {
  const palette = [
    'rgba(34,197,94,.8)', 'rgba(59,130,246,.8)', 'rgba(245,158,11,.8)',
    'rgba(236,72,153,.8)', 'rgba(139,92,246,.8)', 'rgba(20,184,166,.8)',
    'rgba(239,68,68,.8)', 'rgba(249,115,22,.8)', 'rgba(234,179,8,.8)',
    'rgba(16,185,129,.8)', 'rgba(99,102,241,.8)',
  ]
  return Array.from({ length: count }, (_, i) => palette[i % palette.length])
}

// ── Report Card ─────────────────────────────────────────────────────────────
function ReportCard({ icon: Icon, iconBg, iconColor, title, description, onGenerate, loading, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="card p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-200"
    >
      <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center shadow-sm`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
          bg-primary-600 hover:bg-primary-700 active:scale-95 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
      >
        {loading
          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <PrinterIcon className="w-4 h-4" />
        }
        {loading ? 'Génération…' : 'Voir le rapport'}
      </button>
    </motion.div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function AdminReports() {
  const { t } = useI18n()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingTeachers, setLoadingTeachers] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const r = await dashboardApi.getAdminStats()
      setStats(r.data.data)
    } catch (_) {
    } finally {
      setLoading(false)
    }
  }

  // ── Rapport des Classes ──────────────────────────────────────────────────
  const handleClasses = async () => {
    setLoadingClasses(true)
    try {
      const res = await classApi.getAll({ per_page: 1000 })
      const classes = res.data?.data?.data || res.data?.data || []

      // Group by academic year
      const byYear = {}
      classes.forEach(c => {
        const yr = c.academic_year || 'Année inconnue'
        if (!byYear[yr]) byYear[yr] = []
        byYear[yr].push(c)
      })

      const sections = Object.entries(byYear).sort(([a], [b]) => b.localeCompare(a)).map(([yr, list]) => {
        const rows = list.map(c => {
          const tFn = esc(c.teacher?.user?.first_name || '')
          const tLn = esc(c.teacher?.user?.last_name || '')
          const teacher = tFn || tLn ? `${tFn} ${tLn}`.trim() : '—'
          return `<tr>
            <td><strong>${esc(c.course?.code || '—')}</strong></td>
            <td>${esc(c.course?.name || '—')}</td>
            <td style="text-align:center">${esc(c.course?.level || '—')}</td>
            <td style="text-align:center">${esc(c.section || '—')}</td>
            <td style="text-align:center">S${esc(String(c.semester || '—'))}</td>
            <td>${teacher}</td>
            <td>${esc(c.room || '—')}</td>
            <td style="text-align:center">${esc(String(c.capacity || '—'))}</td>
            <td>${esc(c.course?.department?.name || '—')}</td>
          </tr>`
        }).join('')
        return `<div class="level-title">${esc(yr)} — ${list.length} classe${list.length > 1 ? 's' : ''}</div>
          <table><thead><tr>
            <th>Code</th><th>Cours</th><th style="text-align:center">Niveau</th>
            <th style="text-align:center">Section</th><th style="text-align:center">Sem.</th>
            <th>Professeur</th><th>Salle</th><th style="text-align:center">Capacité</th><th>Département</th>
          </tr></thead><tbody>${rows}</tbody></table>`
      }).join('')

      const body = `
        <div class="info-box">
          Total : <strong>${classes.length} classe${classes.length > 1 ? 's' : ''}</strong> sur <strong>${Object.keys(byYear).length} année${Object.keys(byYear).length > 1 ? 's' : ''}</strong>
        </div>
        ${sections}`

      if (!openReport('Rapport des Classes', 'Liste Complète des Classes par Année Académique', body)) {
        alert('Autorisez les pop-ups pour afficher le rapport')
      }
    } catch {
      alert('Erreur lors de la génération du rapport des classes')
    } finally {
      setLoadingClasses(false)
    }
  }

  // ── Rapport des Enseignants ──────────────────────────────────────────────
  const handleTeachers = async () => {
    setLoadingTeachers(true)
    try {
      const res = await teacherApi.getAll({ per_page: 1000 })
      const teachers = res.data?.data?.data || res.data?.data || []

      // Group by faculty → department
      const byFaculty = {}
      teachers.forEach(t => {
        const fac = t.department?.faculty?.name || 'Sans Faculté'
        const dept = t.department?.name || 'Sans Département'
        if (!byFaculty[fac]) byFaculty[fac] = {}
        if (!byFaculty[fac][dept]) byFaculty[fac][dept] = []
        byFaculty[fac][dept].push(t)
      })

      const sections = Object.entries(byFaculty).sort(([a], [b]) => a.localeCompare(b)).map(([fac, depts]) => {
        const facTotal = Object.values(depts).reduce((s, a) => s + a.length, 0)
        const deptSections = Object.entries(depts).sort(([a], [b]) => a.localeCompare(b)).map(([dept, list]) => {
          const rows = list.map(t => {
            const fn = esc(t.user?.first_name || '')
            const ln = esc(t.user?.last_name || '')
            const stCls = t.user?.status === 'inactive' ? 'r' : 'g'
            const stLbl = t.user?.status === 'inactive' ? 'Inactif' : 'Actif'
            return `<tr>
              <td style="font-family:monospace;font-size:10px">${esc(t.employee_id || '—')}</td>
              <td><strong>${fn} ${ln}</strong></td>
              <td>${esc(t.user?.email || '—')}</td>
              <td>${esc(t.user?.phone || '—')}</td>
              <td style="text-align:center"><span class="badge ${stCls}">${stLbl}</span></td>
            </tr>`
          }).join('')
          return `<div class="dept-title">${esc(dept)} (${list.length})</div>
            <table><thead><tr>
              <th>ID Employé</th><th>Nom Complet</th><th>Email</th><th>Téléphone</th>
              <th style="text-align:center">Statut</th>
            </tr></thead><tbody>${rows}</tbody></table>`
        }).join('')
        return `<div class="faculty-title">${esc(fac)} — ${facTotal} enseignant${facTotal > 1 ? 's' : ''}</div>${deptSections}`
      }).join('')

      const body = `
        <div class="info-box">
          Total : <strong>${teachers.length} enseignant${teachers.length > 1 ? 's' : ''}</strong>
          dans <strong>${Object.keys(byFaculty).length} faculté${Object.keys(byFaculty).length > 1 ? 's' : ''}</strong>
        </div>
        ${sections}`

      if (!openReport('Rapport des Enseignants', 'Liste des Enseignants par Faculté et Département', body)) {
        alert('Autorisez les pop-ups pour afficher le rapport')
      }
    } catch {
      alert('Erreur lors de la génération du rapport des enseignants')
    } finally {
      setLoadingTeachers(false)
    }
  }

  // ── Liste des Cours ──────────────────────────────────────────────────────
  const handleCourses = async () => {
    setLoadingCourses(true)
    try {
      const [coursesRes] = await Promise.all([
        courseApi.getAll({ per_page: 2000 }),
        departmentApi.getAll({ per_page: 200 }),
      ])
      const courses = coursesRes.data?.data?.data || coursesRes.data?.data || []

      // Group by department
      const byDept = {}
      courses.forEach(c => {
        const dept = c.department?.name || 'Sans Département'
        if (!byDept[dept]) byDept[dept] = []
        byDept[dept].push(c)
      })

      const LEVEL_ORDER = ['L1','L2','L3','M1','M2','D1','D2','D3']
      const sections = Object.entries(byDept).sort(([a], [b]) => a.localeCompare(b)).map(([dept, list]) => {
        const sorted = [...list].sort((a, b) => {
          const ia = LEVEL_ORDER.indexOf(a.level), ib = LEVEL_ORDER.indexOf(b.level)
          return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.semester - b.semester
        })
        const rows = sorted.map(c => {
          const actCls = c.is_active ? 'g' : 'r'
          const actLbl = c.is_active ? 'Actif' : 'Inactif'
          return `<tr>
            <td style="font-family:monospace;font-size:10px"><strong>${esc(c.code || '—')}</strong></td>
            <td>${esc(c.name || '—')}</td>
            <td style="text-align:center">${esc(c.level || '—')}</td>
            <td style="text-align:center">S${esc(String(c.semester || '—'))}</td>
            <td style="text-align:center">${esc(String(c.credits || 0))}</td>
            <td>${esc(c.course_type || '—')}</td>
            <td style="text-align:center"><span class="badge ${actCls}">${actLbl}</span></td>
          </tr>`
        }).join('')
        return `<div class="level-title">${esc(dept)} (${list.length} cours)</div>
          <table><thead><tr>
            <th>Code</th><th>Intitulé</th><th style="text-align:center">Niveau</th>
            <th style="text-align:center">Sem.</th><th style="text-align:center">Crédits</th>
            <th>Type</th><th style="text-align:center">Statut</th>
          </tr></thead><tbody>${rows}</tbody></table>`
      }).join('')

      const body = `
        <div class="info-box">
          Total : <strong>${courses.length} cours</strong> dans <strong>${Object.keys(byDept).length} département${Object.keys(byDept).length > 1 ? 's' : ''}</strong>
          &nbsp;·&nbsp; Actifs : <strong>${courses.filter(c => c.is_active).length}</strong>
        </div>
        ${sections}`

      if (!openReport('Liste des Cours', 'Catalogue Complet des Cours par Département', body)) {
        alert('Autorisez les pop-ups pour afficher le rapport')
      }
    } catch {
      alert('Erreur lors de la génération de la liste des cours')
    } finally {
      setLoadingCourses(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const levelData = {
    labels: stats?.students_by_level?.map((l) => l.level) || [],
    datasets: [{ label: 'Students', data: stats?.students_by_level?.map((l) => l.count) || [], backgroundColor: generateColors(stats?.students_by_level?.length || 0) }],
  }
  const deptData = {
    labels: stats?.students_by_department?.map((d) => d.name) || [],
    datasets: [{ data: stats?.students_by_department?.map((d) => d.count) || [], backgroundColor: generateColors(stats?.students_by_department?.length || 0), borderWidth: 0 }],
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">{t('reports')}</h1>
        <p className="text-gray-500 dark:text-gray-400">{t('reports_subtitle')}</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={stats?.stats?.total_students || 0} icon={UserGroupIcon} color="primary" />
        <StatCard title="Active Students" value={stats?.stats?.active_students || 0} icon={UserGroupIcon} color="teal" delay={0.1} />
        <StatCard title="Total Teachers" value={stats?.stats?.total_teachers || 0} icon={UsersIcon} color="blue" delay={0.2} />
        <StatCard title="Active Teachers" value={stats?.stats?.active_teachers || 0} icon={UsersIcon} color="purple" delay={0.3} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('students_by_level')}</h3>
          <div className="h-64">
            <Bar data={levelData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }} />
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('students_by_department')}</h3>
          <div className="h-64 flex items-center justify-center">
            <Pie data={deptData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
          </div>
        </motion.div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <BookOpenIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Academic Overview</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-100">
              <span className="text-gray-500">Total Courses</span><span className="font-medium">{stats?.stats?.total_courses || 0}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-100">
              <span className="text-gray-500">Total Departments</span><span className="font-medium">{stats?.stats?.total_departments || 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Total Faculties</span><span className="font-medium">{stats?.stats?.total_faculties || 0}</span>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Quick Stats</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-100">
              <span className="text-gray-500">Student/Teacher Ratio</span>
              <span className="font-medium">{stats?.stats?.total_teachers > 0 ? Math.round(stats?.stats?.total_students / stats?.stats?.total_teachers) : 0}:1</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100 dark:border-dark-100">
              <span className="text-gray-500">Avg Students/Department</span>
              <span className="font-medium">{stats?.stats?.total_departments > 0 ? Math.round(stats?.stats?.total_students / stats?.stats?.total_departments) : 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Avg Courses/Department</span>
              <span className="font-medium">{stats?.stats?.total_departments > 0 ? Math.round(stats?.stats?.total_courses / stats?.stats?.total_departments) : 0}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Report Cards ─────────────────────────────────────────────────── */}
      <div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Rapports Imprimables</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Générez des rapports détaillés prêts à imprimer ou à exporter</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportCard
            icon={CalendarIcon}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            title="Rapport des Classes"
            description="Liste complète de toutes les classes : cours, niveau, section, professeur, salle et département, groupées par année académique."
            onGenerate={handleClasses}
            loading={loadingClasses}
            delay={0.7}
          />
          <ReportCard
            icon={UsersIcon}
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
            iconColor="text-indigo-600 dark:text-indigo-400"
            title="Rapport des Enseignants"
            description="Répertoire complet des enseignants organisé par faculté et département, avec email, ID employé et statut."
            onGenerate={handleTeachers}
            loading={loadingTeachers}
            delay={0.8}
          />
          <ReportCard
            icon={BookOpenIcon}
            iconBg="bg-rose-100 dark:bg-rose-900/30"
            iconColor="text-rose-600 dark:text-rose-400"
            title="Liste des Cours"
            description="Catalogue complet de tous les cours par département : code, intitulé, niveau, semestre, crédits, type et statut."
            onGenerate={handleCourses}
            loading={loadingCourses}
            delay={0.9}
          />
        </div>
      </div>
    </div>
  )
}
