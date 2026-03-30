import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  UserIcon,
  SparklesIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

// ─── UI string translations ───────────────────────────────────────────────────
const UI = {
  fr: {
    online: 'En ligne',
    placeholder: 'Écrivez votre message…',
    searchPlaceholder: 'Rechercher un étudiant…',
    error: "Désolé, une erreur s'est produite. Veuillez réessayer.",
    noVoice: 'Reconnaissance vocale non supportée par ce navigateur.',
    grade: 'Moyenne', presence: 'Présence', balance: 'Solde',
    viewProfile: 'Voir le profil complet →',
    switchLang: 'Switch to English',
  },
  en: {
    online: 'Online',
    placeholder: 'Write your message…',
    searchPlaceholder: 'Search for a student…',
    error: 'Sorry, an error occurred. Please try again.',
    noVoice: 'Voice recognition is not supported by this browser.',
    grade: 'Average', presence: 'Attendance', balance: 'Balance',
    viewProfile: 'View full profile →',
    switchLang: 'Passer en Français',
  },
}

// ─── Role-aware bilingual greetings ──────────────────────────────────────────
const GREET = {
  fr: {
    morning: 'Bonjour', afternoon: 'Bon après-midi', evening: 'Bonsoir',
    admin: (n, t) => ({
      message: `${t} ${n}! 👋\n\nJe suis **Simon**, votre assistant IA. En tant qu'administrateur vous avez accès à toutes les données du système.\n\n💡 **Questions que vous pouvez poser :**\n• "Recherche étudiant Dupont"\n• "Statistiques globales"\n• "KPIs institutionnels"\n• "Alertes étudiants"\n• "Notes soumises par les enseignants"\n• "Rapport financier du mois"`,
      quickActions: [
        { label: '🔍 Rechercher un étudiant', action: 'search_student' },
        { label: '📊 KPIs institutionnels', action: 'show_kpis' },
        { label: '⚠️ Alertes étudiants', action: 'show_alerts' },
        { label: '📝 Notes soumises', action: 'show_grades' },
      ],
    }),
    teacher: (n, t) => ({
      message: `${t} ${n}! 👋\n\nJe suis **Simon**, votre assistant pédagogique.\n\n💡 **Questions que vous pouvez poser :**\n• "Montre-moi mes cours"\n• "Combien d'étudiants j'ai?"\n• "Quel est mon emploi du temps?"\n• "Comment saisir les notes?"\n• "Mes étudiants absents"`,
      quickActions: [
        { label: '📚 Mes cours', action: 'my_courses' },
        { label: '👥 Mes étudiants', action: 'my_students' },
        { label: '📅 Mon emploi du temps', action: 'my_schedule' },
        { label: '📝 Saisir les notes', action: 'my_grades_entry' },
      ],
    }),
    student: (n, t) => ({
      message: `${t} ${n}! 👋\n\nJe suis **Simon**, votre assistant étudiant.\n\n💡 **Questions que vous pouvez poser :**\n• "Quelles sont mes notes?"\n• "Combien dois-je payer?"\n• "Mon emploi du temps"\n• "Mes cours inscrits"\n• "Mon taux de présence"`,
      quickActions: [
        { label: '📊 Mes notes', action: 'my_grades' },
        { label: '💰 Mes frais', action: 'my_fees' },
        { label: '📅 Emploi du temps', action: 'my_schedule' },
        { label: '📚 E-Learning', action: 'go_elearning' },
      ],
    }),
    finance: (n, t) => ({
      message: `${t} ${n}! 👋\n\nJe suis **Simon**, votre assistant financier.\n\n💡 **Questions que vous pouvez poser :**\n• "Paiements en retard"\n• "Statistiques du jour"\n• "Rapport mensuel"\n• "Total encaissé ce mois"\n• "Résumé financier global"`,
      quickActions: [
        { label: '💰 Impayés', action: 'show_unpaid' },
        { label: '📊 Stats du jour', action: 'today_stats' },
        { label: '📈 Rapport mensuel', action: 'monthly_report' },
        { label: '🧾 Résumé financier', action: 'finance_summary' },
      ],
    }),
    registrar: (n, t) => ({
      message: `${t} ${n}! 👋\n\nJe suis **Simon**, votre assistant administratif.\n\n💡 **Questions que vous pouvez poser :**\n• "Combien d'étudiants actifs?"\n• "Inscriptions en attente"\n• "Statistiques d'inscriptions"\n• "Nouveaux inscrits ce mois"\n• "Recherche étudiant Dupont"`,
      quickActions: [
        { label: '📋 En attente', action: 'show_pending' },
        { label: '👥 Étudiants actifs', action: 'show_active_students' },
        { label: '📊 Statistiques', action: 'show_registrar_stats' },
        { label: '🎓 Nouveaux inscrits', action: 'show_new_enrollments' },
      ],
    }),
    default: (_, t) => ({
      message: `${t}! Je suis **Simon**, votre assistant ESL. Comment puis-je vous aider?`,
      quickActions: [],
    }),
  },
  en: {
    morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening',
    admin: (n, t) => ({
      message: `${t} ${n}! 👋\n\nI'm **Simon**, your AI assistant. As administrator you have access to all system data.\n\n💡 **Questions you can ask:**\n• "Search for student Smith"\n• "Global statistics"\n• "Institutional KPIs"\n• "Student alerts"\n• "Grades submitted by teachers"\n• "Monthly financial report"`,
      quickActions: [
        { label: '🔍 Search student', action: 'search_student' },
        { label: '📊 Institutional KPIs', action: 'show_kpis' },
        { label: '⚠️ Student alerts', action: 'show_alerts' },
        { label: '📝 Submitted grades', action: 'show_grades' },
      ],
    }),
    teacher: (n, t) => ({
      message: `${t} ${n}! 👋\n\nI'm **Simon**, your teaching assistant.\n\n💡 **Questions you can ask:**\n• "Show me my courses"\n• "How many students do I have?"\n• "What is my schedule?"\n• "How to enter grades?"\n• "Absent students in my class"`,
      quickActions: [
        { label: '📚 My courses', action: 'my_courses' },
        { label: '👥 My students', action: 'my_students' },
        { label: '📅 My schedule', action: 'my_schedule' },
        { label: '📝 Grade entry', action: 'my_grades_entry' },
      ],
    }),
    student: (n, t) => ({
      message: `${t} ${n}! 👋\n\nI'm **Simon**, your student assistant.\n\n💡 **Questions you can ask:**\n• "What are my grades?"\n• "How much are my fees?"\n• "My timetable"\n• "My enrolled courses"\n• "My attendance rate"`,
      quickActions: [
        { label: '📊 My grades', action: 'my_grades' },
        { label: '💰 My fees', action: 'my_fees' },
        { label: '📅 Timetable', action: 'my_schedule' },
        { label: '📚 E-Learning', action: 'go_elearning' },
      ],
    }),
    finance: (n, t) => ({
      message: `${t} ${n}! 👋\n\nI'm **Simon**, your financial assistant.\n\n💡 **Questions you can ask:**\n• "Overdue payments"\n• "Today's statistics"\n• "Monthly report"\n• "Total collected this month"\n• "Global finance summary"`,
      quickActions: [
        { label: '💰 Overdue payments', action: 'show_unpaid' },
        { label: '📊 Today\'s stats', action: 'today_stats' },
        { label: '📈 Monthly report', action: 'monthly_report' },
        { label: '🧾 Finance summary', action: 'finance_summary' },
      ],
    }),
    registrar: (n, t) => ({
      message: `${t} ${n}! 👋\n\nI'm **Simon**, your administrative assistant.\n\n💡 **Questions you can ask:**\n• "How many active students?"\n• "Pending enrollments"\n• "Enrollment statistics"\n• "New enrollments this month"\n• "Search for student Smith"`,
      quickActions: [
        { label: '📋 Pending enrollments', action: 'show_pending' },
        { label: '👥 Active students', action: 'show_active_students' },
        { label: '📊 Statistics', action: 'show_registrar_stats' },
        { label: '🎓 New enrollments', action: 'show_new_enrollments' },
      ],
    }),
    default: (_, t) => ({
      message: `${t}! I'm **Simon**, your ESL assistant. How can I help you?`,
      quickActions: [],
    }),
  },
}

// ─── Quick-action label → message mapping ────────────────────────────────────
const QMSG = {
  fr: {
    search_student:       'Je veux rechercher un étudiant',
    show_kpis:            'Montre-moi les KPIs institutionnels',
    show_alerts:          'Quelles sont les alertes étudiants?',
    show_grades:          'Montre-moi les notes soumises par les enseignants',
    my_courses:           'Montre-moi mes cours',
    my_students:          'Qui sont mes étudiants?',
    my_schedule:          'Quel est mon emploi du temps?',
    my_grades:            'Quelles sont mes notes?',
    my_grades_entry:      'Comment saisir les notes dans le carnet de notes?',
    my_fees:              'Combien dois-je payer en frais?',
    show_unpaid:          'Montre-moi les paiements en retard',
    today_stats:          "Quelles sont les statistiques du jour?",
    monthly_report:       'Génère un rapport mensuel',
    finance_summary:      'Résumé financier global',
    show_pending:         'Quelles sont les inscriptions en attente?',
    show_active_students: "Combien d'étudiants actifs y a-t-il?",
    show_registrar_stats: "Montre-moi les statistiques d'inscriptions",
    show_new_enrollments: 'Quels sont les nouveaux inscrits ce mois?',
  },
  en: {
    search_student:       'I want to search for a student',
    show_kpis:            'Show me institutional KPIs',
    show_alerts:          'What are the student alerts?',
    show_grades:          'Show me grades submitted by teachers',
    my_courses:           'Show me my courses',
    my_students:          'Who are my students?',
    my_schedule:          'What is my schedule?',
    my_grades:            'What are my grades?',
    my_grades_entry:      'How do I enter grades in the grade book?',
    my_fees:              'How much are my fees?',
    show_unpaid:          'Show me overdue payments',
    today_stats:          "What are today's statistics?",
    monthly_report:       'Generate a monthly report',
    finance_summary:      'Global finance summary',
    show_pending:         'What are the pending enrollments?',
    show_active_students: 'How many active students are there?',
    show_registrar_stats: 'Show me enrollment statistics',
    show_new_enrollments: 'Who are the new enrollments this month?',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────
const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [language, setLanguage] = useState(
    () => localStorage.getItem('chatbot_lang') || 'fr'
  )
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = buildGreeting(language)
      addBotMessage(greeting.message, greeting.quickActions)
      if (user?.role === 'student') checkNewStudentContent(language)
    }
  }, [isOpen])

  // ── Language toggle ──────────────────────────────────────
  const toggleLanguage = () => {
    const newLang = language === 'fr' ? 'en' : 'fr'
    setLanguage(newLang)
    localStorage.setItem('chatbot_lang', newLang)
    if (isOpen) {
      setMessages([])
      setTimeout(() => {
        const greeting = buildGreeting(newLang)
        addBotMessage(greeting.message, greeting.quickActions)
      }, 50)
    }
  }

  // ── New content notification for students ───────────────
  const checkNewStudentContent = async (lang) => {
    try {
      const res = await api.get('/notifications')
      const contentTypes = ['new_material', 'new_quiz', 'new_assignment', 'online_session']
      const newItems = (res.data.notifications || []).filter(n => contentTypes.includes(n.type))
      if (newItems.length > 0) {
        const lines = newItems.map(n => `• **${n.title}**: ${n.message}`).join('\n')
        const msg = lang === 'en'
          ? `📢 **New content in your E-Learning:**\n\n${lines}\n\nGo to the **E-Learning** section to access it!`
          : `📢 **Nouveautés dans votre E-Learning:**\n\n${lines}\n\nRendez-vous dans la section **E-Learning** pour y accéder!`
        setTimeout(() => {
          addBotMessage(msg, [{
            label: lang === 'en' ? '📚 Go to E-Learning' : '📚 Aller à l\'E-Learning',
            action: 'go_elearning',
          }])
        }, 800)
      }
    } catch (_) {}
  }

  // ── Build greeting ───────────────────────────────────────
  const buildGreeting = (lang = language) => {
    const hour = new Date().getHours()
    const g = GREET[lang] || GREET.fr
    const timeStr = hour < 12 ? g.morning : hour < 18 ? g.afternoon : g.evening
    const name = user?.first_name || ''
    const role = user?.role
    const fn = g[role] || g.default
    return fn(name, timeStr)
  }

  // ── Message helpers ──────────────────────────────────────
  const addBotMessage = (text, quickActions = null, data = null) => {
    setMessages(prev => [...prev, { sender: 'bot', text, quickActions, data, timestamp: new Date() }])
  }

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { sender: 'user', text, timestamp: new Date() }])
  }

  // ── Core send function ───────────────────────────────────
  const sendMessage = async (userMessage) => {
    if (!userMessage.trim()) return
    addUserMessage(userMessage)
    setIsTyping(true)
    try {
      const response = await api.post('/chatbot', {
        message: userMessage,
        session_id: sessionId,
        language,
      })
      setSessionId(response.data.session_id)
      const bot = response.data.response
      addBotMessage(bot.message, bot.quick_actions, bot.data)
    } catch {
      const uiL = UI[language] || UI.fr
      addBotMessage(uiL.error)
    } finally {
      setIsTyping(false)
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return
    const msg = input.trim()
    setInput('')
    await sendMessage(msg)
  }

  // ── Quick action routing ─────────────────────────────────
  const handleQuickAction = async (action) => {
    if (action === 'go_elearning') {
      setIsOpen(false)
      navigate('/student/elearning')
      return
    }
    const msg = QMSG[language]?.[action] || QMSG.fr[action] || String(action)
    await sendMessage(msg)
  }

  // ── Voice input ──────────────────────────────────────────
  const handleVoiceInput = () => {
    const uiL = UI[language] || UI.fr
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addBotMessage(uiL.noVoice)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = language === 'en' ? 'en-US' : 'fr-FR'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => {
      setInput(event.results[0][0].transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  // ── Role colour ──────────────────────────────────────────
  const getRoleColor = () => {
    switch (user?.role) {
      case 'admin':     return 'from-purple-500 to-purple-600'
      case 'teacher':   return 'from-blue-500 to-blue-600'
      case 'student':   return 'from-primary-500 to-primary-600'
      case 'finance':   return 'from-amber-500 to-amber-600'
      case 'registrar': return 'from-teal-500 to-teal-600'
      default:          return 'from-primary-500 to-primary-600'
    }
  }

  // ── Message formatter (supports **bold**) ────────────────
  const formatMessage = (text) => {
    return text.split('\n').map((line, i, arr) => {
      let content
      if (line.startsWith('├──') || line.startsWith('└──')) {
        content = <span className="text-gray-500 dark:text-gray-400 font-mono text-sm">{line}</span>
      } else if (line.startsWith('━')) {
        content = <span className="text-gray-400 dark:text-gray-500">{line}</span>
      } else if (line.match(/\*\*(.+?)\*\*/)) {
        // Simple bold rendering
        const parts = line.split(/\*\*/)
        content = parts.map((p, pi) =>
          pi % 2 === 1 ? <strong key={pi}>{p}</strong> : <span key={pi}>{p}</span>
        )
      } else if (line.match(/^[📊📋📈📅💰🎓⚠️🔧✅❌🏆💡📚👥🧾📢]/u)) {
        content = <span className="font-medium">{line}</span>
      } else {
        content = line
      }
      return (
        <span key={i}>
          {content}
          {i < arr.length - 1 && <br />}
        </span>
      )
    })
  }

  const uiL = UI[language] || UI.fr

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-dark-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-dark-100 z-50"
          >
            {/* ── Header ── */}
            <div className={`flex items-center justify-between p-4 bg-gradient-to-r ${getRoleColor()} text-white`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Simon Assistant</h3>
                  <p className="text-xs opacity-80">IA • {uiL.online}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Language toggle */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={toggleLanguage}
                  title={uiL.switchLang}
                  className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-bold tracking-wide"
                >
                  {language === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-dark-400">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[85%]">
                    <div
                      className={`p-3 rounded-2xl ${
                        msg.sender === 'user'
                          ? `bg-gradient-to-r ${getRoleColor()} text-white rounded-br-md`
                          : 'bg-white dark:bg-dark-200 text-gray-800 dark:text-white rounded-bl-md shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {formatMessage(msg.text)}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    {msg.quickActions && msg.quickActions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.quickActions.map((action, i) => (
                          <motion.button
                            key={i}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleQuickAction(action.action || action)}
                            className="px-3 py-1.5 bg-white dark:bg-dark-200 border border-gray-200 dark:border-dark-100 rounded-full text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-100 transition-colors shadow-sm"
                          >
                            {action.label || action}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Student Card */}
                    {msg.data && msg.sender === 'bot' && msg.data.student_id && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-4 bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-dark-100"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{msg.data.name}</h4>
                            <p className="text-xs text-gray-500">{msg.data.student_id}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-gray-50 dark:bg-dark-300 rounded-lg">
                            <p className="text-gray-500">{uiL.grade}</p>
                            <p className="font-bold text-primary-600">{msg.data.average}/100</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-dark-300 rounded-lg">
                            <p className="text-gray-500">{uiL.presence}</p>
                            <p className="font-bold text-blue-600">{msg.data.attendance_rate}%</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-dark-300 rounded-lg col-span-2">
                            <p className="text-gray-500">{uiL.balance}</p>
                            <p className="font-bold text-amber-600">{(msg.data.remaining ?? 0).toLocaleString()} RWF</p>
                          </div>
                        </div>
                        <button className="mt-3 w-full py-2 text-xs text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors">
                          {uiL.viewProfile}
                        </button>
                      </motion.div>
                    )}

                    <p className="text-[10px] text-gray-400 mt-1 px-1">
                      {msg.timestamp.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-white dark:bg-dark-200 rounded-bl-md shadow-sm">
                    <div className="flex items-center space-x-1">
                      {[0, 0.2, 0.4].map((delay, i) => (
                        <motion.span
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay }}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Admin Quick Search ── */}
            {user?.role === 'admin' && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-dark-100 bg-white dark:bg-dark-300">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-dark-200 rounded-lg">
                  <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={uiL.searchPlaceholder}
                    className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const q = e.target.value.trim()
                        e.target.value = ''
                        const prefix = language === 'fr' ? "Cherche l'étudiant " : 'Search for student '
                        sendMessage(prefix + q)
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* ── Input bar ── */}
            <div className="p-4 border-t border-gray-100 dark:border-dark-100 bg-white dark:bg-dark-300">
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleVoiceInput}
                  className={`p-3 rounded-xl transition-colors ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 dark:bg-dark-200 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-100'
                  }`}
                >
                  <MicrophoneIcon className="w-5 h-5" />
                </motion.button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={uiL.placeholder}
                  className="flex-1 p-3 rounded-xl bg-gray-100 dark:bg-dark-200 text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className={`p-3 rounded-xl transition-colors ${
                    input.trim()
                      ? `bg-gradient-to-r ${getRoleColor()} text-white shadow-lg`
                      : 'bg-gray-100 dark:bg-dark-200 text-gray-400'
                  }`}
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toggle button ── */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-xl z-50 bg-gradient-to-r ${getRoleColor()} text-white`}
      >
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          {isOpen ? <XMarkIcon className="w-6 h-6" /> : <ChatBubbleLeftRightIcon className="w-6 h-6" />}
        </motion.div>
        {!isOpen && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
          >
            <SparklesIcon className="w-2.5 h-2.5 text-white" />
          </motion.span>
        )}
      </motion.button>
    </>
  )
}

export default Chatbot
