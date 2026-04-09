import { useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  UsersIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline'
import { registrarApi, studentApi, teacherApi } from '../../services/api'
import { useI18n } from '../../i18n/index.jsx'
import { useLevels } from '../../hooks/useLevels'
import { esc, openReportAsyncSafe } from '../../utils/reportPrint'

const ROLES = ['admin', 'finance', 'registrar', 'teacher', 'student']
const ROLE_LABELS = {
  admin: 'Administrateurs',
  finance: 'Personnel Finance',
  registrar: 'Registraires',
  teacher: 'Enseignants',
  student: 'Étudiants',
}

function ReportCard({ icon: Icon, iconBg, iconColor, title, description, onGenerate, loading, delay = 0 }) {
  const { t } = useI18n()
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
        {loading ? t('generating') : t('view_report')}
      </button>
    </motion.div>
  )
}

export default function RegistrarReports() {
  const { t } = useI18n()
  const { levelOrder: LEVEL_ORDER_MAP } = useLevels()
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingLevels, setLoadingLevels] = useState(false)
  const [loadingDepts, setLoadingDepts] = useState(false)

  // ── Rapport Utilisateurs ─────────────────────────────────────────────────
  const handleUsers = async () => {
    setLoadingUsers(true)
    try {
      await openReportAsyncSafe(t('registrar_report_users_title'), async () => {
        const results = await Promise.all(ROLES.map(r => registrarApi.getUsers(r)))
        const byRole = {}
        ROLES.forEach((r, i) => {
          byRole[r] = results[i].data?.data?.data || results[i].data?.data || []
        })

        const sections = ROLES.map(role => {
          const users = byRole[role]
          if (!users.length) return ''
          const rows = users.map(u => {
            const fn = esc(u.user?.first_name || u.first_name || '')
            const ln = esc(u.user?.last_name || u.last_name || '')
            const username = esc(u.user?.username || u.username || '—')
            const email = esc(u.user?.email || u.email || '—')
            const empId = esc(u.employee_id || u.student_id || u.user?.employee_id || '—')
            const rawStatus = u.user?.status ?? u.status ?? ''
            const stLbl = rawStatus === 'inactive' ? 'Inactif' : rawStatus === 'on_leave' ? 'En congé' : rawStatus === 'suspended' ? 'Suspendu' : rawStatus === 'graduated' ? 'Diplômé' : 'Actif'
            return `<tr>
            <td><strong>${fn} ${ln}</strong></td>
            <td style="font-family:monospace;font-size:10px">${username}</td>
            <td>${email}</td>
            <td style="font-family:monospace;font-size:10px">${empId}</td>
            <td style="text-align:center"><span class="badge">${stLbl}</span></td>
          </tr>`
          }).join('')
          return `<div class="level-title">${ROLE_LABELS[role]} (${users.length})</div>
          <table><thead><tr><th>Nom Complet</th><th>Nom d'utilisateur</th><th>Email</th><th>ID</th><th style="text-align:center">Statut</th></tr></thead>
          <tbody>${rows}</tbody></table>`
        }).join('')

        const total = ROLES.reduce((s, r) => s + byRole[r].length, 0)
        const summary = ROLES.map(r => `${ROLE_LABELS[r]}: <strong>${byRole[r].length}</strong>`).join(' &nbsp;·&nbsp; ')

        const body = `
        <div class="info-box">
          Total utilisateurs : <strong>${total}</strong> &nbsp;—&nbsp; ${summary}
        </div>
        ${sections}`
        return { subtitle: t('registrar_report_users_subtitle'), body }
      })
    } catch {
      toast.error(t('error'))
    } finally {
      setLoadingUsers(false)
    }
  }

  // ── Étudiants par Niveau ─────────────────────────────────────────────────
  const handleLevels = async () => {
    setLoadingLevels(true)
    try {
      await openReportAsyncSafe(t('registrar_report_students_by_level_title'), async () => {
        const res = await studentApi.getAll({ per_page: 2000 })
        const students = res.data?.data?.data || res.data?.data || []

        const grouped = {}
        students.forEach(s => {
          const lvl = s.level || 'Inconnu'
          if (!grouped[lvl]) grouped[lvl] = []
          grouped[lvl].push(s)
        })

        const sortedLevels = Object.keys(grouped).sort((a, b) => {
          const ia = LEVEL_ORDER_MAP[a] ?? 99, ib = LEVEL_ORDER_MAP[b] ?? 99
          return ia - ib
        })

        const sections = sortedLevels.map(lvl => {
          const list = grouped[lvl]
          const rows = list.map(s => {
            const fn = esc(s.user?.first_name || '')
            const ln = esc(s.user?.last_name || '')
            const username = esc(s.user?.username || '—')
            const enrolDate = s.enrollment_date
              ? new Date(s.enrollment_date).toLocaleDateString('fr-FR')
              : '—'
            const rawStatus = s.status ?? ''
            const stLbl = rawStatus === 'inactive' ? 'Inactif' : rawStatus === 'graduated' ? 'Diplômé' : rawStatus === 'suspended' ? 'Suspendu' : rawStatus === 'on_leave' ? 'En congé' : rawStatus === 'transfer' ? 'Transféré' : 'Actif'
            return `<tr>
            <td style="font-family:monospace;font-size:10px">${esc(s.student_id || '—')}</td>
            <td><strong>${fn} ${ln}</strong></td>
            <td style="font-family:monospace;font-size:10px">${username}</td>
            <td>${esc(s.department?.name || '—')}</td>
            <td>${esc(s.department?.faculty?.name || '—')}</td>
            <td>${enrolDate}</td>
            <td style="text-align:center"><span class="badge">${stLbl}</span></td>
          </tr>`
          }).join('')
          return `<div class="level-title">${esc(lvl)} — ${list.length} étudiant${list.length > 1 ? 's' : ''}</div>
          <table><thead><tr>
            <th>Matricule</th><th>Nom Complet</th><th>Nom d'utilisateur</th><th>Département</th><th>Faculté</th><th>Inscription</th>
            <th style="text-align:center">Statut</th>
          </tr></thead><tbody>${rows}</tbody></table>`
        }).join('')

        const body = `
        <div class="info-box">
          Total : <strong>${students.length} étudiant${students.length > 1 ? 's' : ''}</strong> &nbsp;·&nbsp;
          ${sortedLevels.map(l => `${l}: ${grouped[l].length}`).join(' &nbsp;·&nbsp; ')}
        </div>
        ${sections}`
        return { subtitle: t('registrar_report_students_by_level_subtitle'), body }
      })
    } catch {
      toast.error(t('error'))
    } finally {
      setLoadingLevels(false)
    }
  }

  // ── Enseignants par Département/Faculté ──────────────────────────────────
  const handleDepts = async () => {
    setLoadingDepts(true)
    try {
      await openReportAsyncSafe(t('registrar_report_teachers_by_department_title'), async () => {
        const res = await teacherApi.getAll({ per_page: 1000 })
        const teachers = res.data?.data?.data || res.data?.data || []

        const byFaculty = {}
        teachers.forEach(t => {
          const fac = t.department?.faculty?.name || 'Sans Faculté'
          const dept = t.department?.name || 'Sans Département'
          if (!byFaculty[fac]) byFaculty[fac] = {}
          if (!byFaculty[fac][dept]) byFaculty[fac][dept] = []
          byFaculty[fac][dept].push(t)
        })

        const sections = Object.entries(byFaculty).sort(([a], [b]) => a.localeCompare(b)).map(([fac, depts]) => {
          const facTotal = Object.values(depts).reduce((s, arr) => s + arr.length, 0)
          const deptSections = Object.entries(depts).sort(([a], [b]) => a.localeCompare(b)).map(([dept, list]) => {
            const rows = list.map(t => {
              const fn = esc(t.user?.first_name || '')
              const ln = esc(t.user?.last_name || '')
              const username = esc(t.user?.username || '—')
              const email = esc(t.user?.email || '—')
              const empId = esc(t.employee_id || '—')
              const rawStatus = t.user?.status ?? t.status ?? ''
              const stLbl = rawStatus === 'inactive' ? 'Inactif' : rawStatus === 'on_leave' ? 'En congé' : rawStatus === 'suspended' ? 'Suspendu' : 'Actif'
              return `<tr>
              <td style="font-family:monospace;font-size:10px">${empId}</td>
              <td><strong>${fn} ${ln}</strong></td>
              <td style="font-family:monospace;font-size:10px">${username}</td>
              <td>${email}</td>
              <td style="text-align:center"><span class="badge">${stLbl}</span></td>
            </tr>`
            }).join('')
            return `<div class="dept-title">${esc(dept)} (${list.length})</div>
            <table><thead><tr><th>ID Employé</th><th>Nom Complet</th><th>Nom d'utilisateur</th><th>Email</th><th style="text-align:center">Statut</th></tr></thead>
            <tbody>${rows}</tbody></table>`
          }).join('')
          return `<div class="faculty-title">${esc(fac)} — ${facTotal} enseignant${facTotal > 1 ? 's' : ''}</div>${deptSections}`
        }).join('')

        const body = `
        <div class="info-box">
          Total : <strong>${teachers.length} enseignant${teachers.length > 1 ? 's' : ''}</strong> dans
          <strong>${Object.keys(byFaculty).length} faculté${Object.keys(byFaculty).length > 1 ? 's' : ''}</strong>
        </div>
        ${sections}`
        return { subtitle: t('registrar_report_teachers_by_department_subtitle'), body }
      })
    } catch {
      toast.error(t('error'))
    } finally {
      setLoadingDepts(false)
    }
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
          Rapports — Registrariat
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Générez les rapports officiels sur les utilisateurs, étudiants et enseignants
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportCard
          icon={UsersIcon}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-400"
          title="Rapport Total des Utilisateurs"
          description="Liste complète de tous les utilisateurs de la plateforme, organisée par rôle : admins, finance, registraires, enseignants et étudiants."
          onGenerate={handleUsers}
          loading={loadingUsers}
          delay={0}
        />
        <ReportCard
          icon={AcademicCapIcon}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
          title="Étudiants par Niveau"
          description="Listes des étudiants regroupés par niveau académique : L1, L2, L3, M1, M2, D1, D2, D3 — avec département, faculté et statut."
          onGenerate={handleLevels}
          loading={loadingLevels}
          delay={0.1}
        />
        <ReportCard
          icon={BuildingLibraryIcon}
          iconBg="bg-teal-100 dark:bg-teal-900/30"
          iconColor="text-teal-600 dark:text-teal-400"
          title="Enseignants par Département"
          description="Répertoire complet des enseignants organisé par faculté et département, avec identifiant employé et statut."
          onGenerate={handleDepts}
          loading={loadingDepts}
          delay={0.2}
        />
      </div>
    </div>
  )
}
